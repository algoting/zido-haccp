# ProGuard / R8 Rules for Zido HACCP Android App

# Keep JavascriptInterface methods for WebView interop
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebViews and WebViewClients
-keep class android.webkit.** { *; }

# Keep AndroidX & Material Design components
-keep class androidx.** { *; }
-keep class com.google.android.material.** { *; }

# Keep app package entry points
-keep class online.zidohaccp.app.** { *; }
