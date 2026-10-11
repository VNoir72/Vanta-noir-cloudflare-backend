package store.vantanoir.paystack

import android.content.Intent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VantaPaystackModule : Module() {
  private var pending: Promise? = null
  override fun definition() = ModuleDefinition {
    Name("VantaPaystack")
    AsyncFunction("launch") { publicKey: String, accessCode: String, promise: Promise ->
      val activity = appContext.currentActivity
      when {
        pending != null -> promise.reject("BUSY", "A card payment is already open.", null)
        activity == null -> promise.reject("NO_ACTIVITY", "Open the app before paying.", null)
        !publicKey.matches(Regex("^pk_(live|test)_[A-Za-z0-9]+$")) || accessCode.isBlank() ->
          promise.reject("INVALID_CONFIG", "Card payments are not configured.", null)
        else -> {
          pending = promise
          try {
            activity.startActivityForResult(Intent(activity, CardPaymentActivity::class.java)
              .putExtra("publicKey", publicKey).putExtra("accessCode", accessCode), 57412)
          } catch (_: Exception) {
            pending = null
            promise.reject("LAUNCH_FAILED", "Could not open card payment. Your order reference is preserved.", null)
          }
        }
      }
    }.runOnQueue(Queues.MAIN)
    OnActivityResult { _, result ->
      if (result.requestCode == 57412) {
        val promise = pending
        pending = null
        promise?.resolve(result.data?.getStringExtra("status") ?: "closed")
      }
    }
    OnDestroy {
      pending?.reject("INTERRUPTED", "Payment screen interrupted. Verify your saved order before retrying.", null)
      pending = null
    }
  }
}
