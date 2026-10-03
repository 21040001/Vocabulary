package com.vocabulary

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Açılış ekranı (Theme.App.Starting). super.onCreate'ten ÖNCE çağrılmalı.
    installSplashScreen()
    // react-native-screens: sistem uygulamayı arka planda kapatıp geri açtığında
    // eski ekran durumunu geri yüklemeye çalışıp çökmesin diye null veriyoruz.
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "Vocabulary"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
