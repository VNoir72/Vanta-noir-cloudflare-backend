package store.vantanoir.paystack

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import com.paystack.android.core.Paystack
import com.paystack.android.ui.paymentsheet.PaymentSheet
import com.paystack.android.ui.paymentsheet.PaymentSheetResult

// A private activity registers the SDK's result contract before STARTED.
// No card fields or raw card data ever cross the React Native bridge.
class CardPaymentActivity : ComponentActivity() {
  private lateinit var sheet: PaymentSheet
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    setResult(Activity.RESULT_CANCELED, Intent().putExtra("status", "closed"))
    val publicKey = intent.getStringExtra("publicKey") ?: ""
    val code = intent.getStringExtra("accessCode") ?: ""
    if (publicKey.isBlank() || code.isBlank()) { finish(); return }
    try {
      Paystack.builder().setPublicKey(publicKey).setLoggingEnabled(false).build()
      sheet = PaymentSheet(this) { result ->
        val status = when (result) {
          is PaymentSheetResult.Completed -> "completed"
          is PaymentSheetResult.Cancelled -> "closed"
          is PaymentSheetResult.Failed -> "failed"
        }
        setResult(Activity.RESULT_OK, Intent().putExtra("status", status))
        finish()
      }
      // Re-creation reconnects the result listener, never launches a second payment sheet.
      if (savedInstanceState == null) sheet.launch(code)
    } catch (_: Exception) {
      setResult(Activity.RESULT_OK, Intent().putExtra("status", "failed"))
      finish()
    }
  }
}
