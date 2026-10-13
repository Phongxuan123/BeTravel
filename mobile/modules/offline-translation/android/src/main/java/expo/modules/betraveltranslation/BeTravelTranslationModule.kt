package expo.modules.betraveltranslation

import android.content.Intent
import android.speech.tts.TextToSpeech
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class BeTravelTranslationModule : Module() {
  private val manager get() = RemoteModelManager.getInstance()
  private val supported = setOf("vi", "en", "ko", "ja", "th", "zh", "fr", "de")

  private fun translator(source: String, target: String) = Translation.getClient(
    TranslatorOptions.Builder().setSourceLanguage(source).setTargetLanguage(target).build()
  )

  override fun definition() = ModuleDefinition {
    Name("BeTravelTranslation")

    AsyncFunction("installedLanguages") { promise: Promise ->
      manager.getDownloadedModels(TranslateRemoteModel::class.java)
        .addOnSuccessListener { models -> promise.resolve(models.map { it.language }) }
        .addOnFailureListener { promise.reject("MODEL_STATUS", "Không đọc được gói ngôn ngữ.", it) }
    }

    // Chỉ thao tác tải do người dùng chọn mới được phép truy cập mạng tải model.
    AsyncFunction("prepare") { source: String, target: String, cellular: Boolean, promise: Promise ->
      if (source !in supported || target !in supported || source == target) {
        promise.reject("LANGUAGE", "Cặp ngôn ngữ không hợp lệ.", null)
        return@AsyncFunction
      }
      val client = translator(source, target)
      val conditions = DownloadConditions.Builder().apply { if (!cellular) requireWifi() }.build()
      client.downloadModelIfNeeded(conditions)
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("MODEL_DOWNLOAD", "Không tải được gói dịch. Kiểm tra mạng và bộ nhớ.", it) }
        .addOnCompleteListener { client.close() }
    }

    AsyncFunction("translate") { text: String, source: String, target: String, promise: Promise ->
      if (source !in supported || target !in supported || text.isBlank() || text.length > 500) {
        promise.reject("INPUT", "Đoạn dịch hoặc ngôn ngữ không hợp lệ.", null)
        return@AsyncFunction
      }
      // Không gọi downloadModelIfNeeded tại đây: chế độ offline không tự tải mạng.
      val client = translator(source, target)
      client.translate(text)
        .addOnSuccessListener { promise.resolve(it) }
        .addOnFailureListener { promise.reject("TRANSLATION", "Không dịch được trên máy. Kiểm tra gói ngôn ngữ.", it) }
        .addOnCompleteListener { client.close() }
    }

    AsyncFunction("deleteLanguage") { language: String, promise: Promise ->
      if (language !in supported || language == TranslateLanguage.ENGLISH) {
        promise.reject("LANGUAGE", "Không thể xóa gói ngôn ngữ này.", null)
        return@AsyncFunction
      }
      manager.deleteDownloadedModel(TranslateRemoteModel.Builder(language).build())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("MODEL_DELETE", "Không xóa được gói ngôn ngữ.", it) }
    }

    // Expo Speech không trả isNetworkConnectionRequired; lọc giọng tại native để không
    // chọn nhầm giọng cloud khi người dùng đã chọn offline.
    AsyncFunction("offlineVoiceIds") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("TTS", "Chưa có ngữ cảnh phát âm.", null)
        return@AsyncFunction
      }
      var engine: TextToSpeech? = null
      engine = TextToSpeech(context) { status ->
        try {
          if (status != TextToSpeech.SUCCESS) promise.reject("TTS", "Chưa có dịch vụ phát âm.", null)
          else promise.resolve(engine?.voices?.filter {
            !it.isNetworkConnectionRequired && !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
          }?.map { it.name } ?: emptyList<String>())
        } finally { engine?.shutdown() }
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("openVoiceSettings") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      val intent = Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try { context.startActivity(intent) }
      catch (_: android.content.ActivityNotFoundException) {
        context.startActivity(Intent(android.provider.Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      null
    }.runOnQueue(Queues.MAIN)
  }
}
