Pod::Spec.new do |s|
  s.name = 'BeTravelTranslation'
  s.version = '1.0.0'
  s.summary = 'Be.Travel on-device translation'
  s.description = 'Local Expo module for explicit ML Kit model management and offline translation.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Be.Travel'
  s.homepage = 'https://github.com/Phongxuan123/BeTravel'
  s.source = { :git => s.homepage }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'GoogleMLKit/Translate', '8.0.0'
  s.source_files = '**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
