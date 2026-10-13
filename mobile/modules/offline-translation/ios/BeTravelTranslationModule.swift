import ExpoModulesCore
import MLKitTranslate
import MLKitCommon
import AVFAudio

public class BeTravelTranslationModule: Module {
  private let supported: Set<String> = ["vi", "en", "ko", "ja", "th", "zh", "fr", "de"]

  private func translator(_ source: String, _ target: String) -> Translator {
    Translator.translator(options: TranslatorOptions(
      sourceLanguage: TranslateLanguage(rawValue: source),
      targetLanguage: TranslateLanguage(rawValue: target)
    ))
  }

  public func definition() -> ModuleDefinition {
    Name("BeTravelTranslation")

    // Nhận giọng để session ở playAndRecord/measurement. Chuyển về loa trước TTS
    // để không bị âm lượng rất nhỏ hoặc tắt tiếng khi người dùng vừa dùng micro.
    AsyncFunction("prepareSpeech") {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
      try audio.setActive(true)
    }.runOnQueue(.main)

    AsyncFunction("finishSpeech") {
      try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }.runOnQueue(.main)

    AsyncFunction("installedLanguages") { () -> [String] in
      ModelManager.modelManager().downloadedTranslateModels.map { $0.language.rawValue }
    }

    // Giữ client sống tới callback; tải chỉ khi người dùng chủ động chuẩn bị gói.
    AsyncFunction("prepare") { (source: String, target: String, cellular: Bool, promise: Promise) in
      guard self.supported.contains(source), self.supported.contains(target), source != target else {
        promise.reject("LANGUAGE", "Cặp ngôn ngữ không hợp lệ.")
        return
      }
      let client = self.translator(source, target)
      let conditions = ModelDownloadConditions(allowsCellularAccess: cellular, allowsBackgroundDownloading: false)
      client.downloadModelIfNeeded(with: conditions) { [client] error in
        _ = client
        if let error { promise.reject("MODEL_DOWNLOAD", "Không tải được gói dịch. Kiểm tra mạng và bộ nhớ.", error) }
        else { promise.resolve(nil) }
      }
    }

    AsyncFunction("translate") { (text: String, source: String, target: String, promise: Promise) in
      guard self.supported.contains(source), self.supported.contains(target),
            !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, text.utf16.count <= 500 else {
        promise.reject("INPUT", "Đoạn dịch hoặc ngôn ngữ không hợp lệ.")
        return
      }
      let client = self.translator(source, target)
      // Không tải model ở đường dịch; thiếu gói thì trả lỗi, không chuyển qua cloud.
      client.translate(text) { [client] translated, error in
        _ = client
        if let error { promise.reject("TRANSLATION", "Không dịch được trên máy. Kiểm tra gói ngôn ngữ.", error) }
        else if let translated { promise.resolve(translated) }
        else { promise.reject("TRANSLATION", "Không nhận được bản dịch.") }
      }
    }

    AsyncFunction("deleteLanguage") { (language: String, promise: Promise) in
      guard self.supported.contains(language), language != "en" else {
        promise.reject("LANGUAGE", "Không thể xóa gói ngôn ngữ này.")
        return
      }
      let model = TranslateRemoteModel.translateRemoteModel(language: TranslateLanguage(rawValue: language))
      ModelManager.modelManager().deleteDownloadedModel(model) { error in
        if let error { promise.reject("MODEL_DELETE", "Không xóa được gói ngôn ngữ.", error) }
        else { promise.resolve(nil) }
      }
    }
  }
}
