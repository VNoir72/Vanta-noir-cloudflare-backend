package store.vantanoir.paystack

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.Promise
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

// Public catalogue GETs only. Never retries a charge, booking or account mutation.
object CellularFallback {
 fun fetch(context: Context, path: String, promise: Promise) {
  if(path !in listOf("/api/catalog", "/health")){promise.reject("INVALID_PATH","Unsupported acceleration request.",null);return}
  val cm=context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
  val active=cm.getNetworkCapabilities(cm.activeNetwork)
  if(active?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)!=true){promise.reject("NOT_WIFI","Cellular fallback is only used when Wi-Fi is weak.",null);return}
  val done=AtomicBoolean(false)
  val handler=Handler(Looper.getMainLooper())
  lateinit var callback: ConnectivityManager.NetworkCallback
  lateinit var timeout: Runnable
  fun finish(value:String?,message:String){if(!done.compareAndSet(false,true))return;handler.removeCallbacks(timeout);try{cm.unregisterNetworkCallback(callback)}catch(_:Exception){};if(value!=null)promise.resolve(value)else promise.reject("NETWORK_UNAVAILABLE",message,null)}
  callback=object:ConnectivityManager.NetworkCallback(){
   override fun onAvailable(network:Network){Thread {
    var connection:HttpURLConnection?=null
    try{
     connection=network.openConnection(URL("https://api.vantanoir.store"+path)) as HttpURLConnection
     connection.connectTimeout=8000;connection.readTimeout=8000;connection.instanceFollowRedirects=false
     if(connection.responseCode!=200)throw IllegalStateException()
     val bytes=connection.inputStream.use { input ->
      val output=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192)
      while(true){val count=input.read(buffer);if(count<0)break;output.write(buffer,0,count);if(output.size()>4*1024*1024)throw IllegalStateException()}
      output.toByteArray()
     }
     if(bytes.size>4*1024*1024)throw IllegalStateException()
     finish(String(bytes,Charsets.UTF_8),"")
    }catch(_:Exception){finish(null,"Mobile data could not reach the store.")}finally{connection?.disconnect()}
   }.start()}
   override fun onUnavailable(){finish(null,"Mobile data is unavailable. Check your phone's data settings.")}
  }
  timeout=Runnable{finish(null,"Mobile data connection timed out.")}
  handler.postDelayed(timeout,18000)
  try{cm.requestNetwork(NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_CELLULAR).addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),callback)}catch(_:Exception){finish(null,"Mobile data fallback is unavailable on this device.")}
 }
}
