export interface NativeCodeFile {
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const ANDROID_COMPANION_FILES: NativeCodeFile[] = [
  {
    filename: 'LilaWebBridgeInterface.kt',
    language: 'kotlin',
    description: 'JavaScript Interface bridge exposed to the WebView (window.AndroidBridge) supporting Calls, Calculator, Media & Permissions',
    code: `package com.lila.voice.companion

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.provider.Settings
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lila Voice AI Native Bridge Interface (v3: Full Device Control)
 * Exposed to WebView as 'window.AndroidBridge'
 */
class LilaWebBridgeInterface(private val context: Context) {

    @JavascriptInterface
    fun isNativeCompanionAvailable(): Boolean = true

    // ==========================================
    // 1. Permissions Check & Request Methods
    // ==========================================

    @JavascriptInterface
    fun hasPhonePermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun hasContactsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun hasMicPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun hasNotificationAccess(): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        return flat?.contains(packageName) == true
    }

    @JavascriptInterface
    fun hasAccessibilityAccess(): Boolean {
        val expectedServiceName = "\${context.packageName}/\${LilaAccessibilityService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        return enabledServices?.contains(expectedServiceName) == true
    }

    @JavascriptInterface
    fun requestPhonePermission() {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = "com.lila.action.REQUEST_PHONE_PERMISSION"
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun requestContactsPermission() {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = "com.lila.action.REQUEST_CONTACTS_PERMISSION"
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun openNotificationAccessSettings() {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        } else {
            Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    // ==========================================
    // 2. Step 1: Phone Calling (ACTION_CALL / ACTION_DIAL)
    // ==========================================

    @JavascriptInterface
    fun makeCall(phoneNumber: String, contactName: String?): Boolean {
        val sanitized = phoneNumber.replace(Regex("[^0-9+]"), "")
        if (sanitized.isEmpty()) return false

        return try {
            val intent = if (hasPhonePermission()) {
                Intent(Intent.ACTION_CALL, Uri.parse("tel:$sanitized"))
            } else {
                Intent(Intent.ACTION_DIAL, Uri.parse("tel:$sanitized"))
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // ==========================================
    // 3. Step 2: Media Controls (MediaSessionManager)
    // ==========================================

    @JavascriptInterface
    fun controlMedia(action: String): Boolean {
        return LilaNotificationListenerService.instance?.controlMedia(action) ?: false
    }

    // ==========================================
    // 4. Step 3: Built-in App Operations (Calculator & Notepad)
    // ==========================================

    @JavascriptInterface
    fun operateCalculator(expression: String): String {
        // 1. Launch calculator app
        openApp("calculator")
        // 2. Automate button presses via LilaAccessibilityService
        val result = LilaAccessibilityService.instance?.operateCalculator(expression)
        return result ?: "Launched Calculator for $expression"
    }

    @JavascriptInterface
    fun typeTextIntoApp(targetApp: String, text: String): Boolean {
        val opened = openApp(targetApp)
        if (!opened) return false
        return LilaAccessibilityService.instance?.typeText(targetApp, text) ?: false
    }

    // ==========================================
    // 5. App Launchers & Deep Search
    // ==========================================

    @JavascriptInterface
    fun openApp(targetApp: String): Boolean {
        val cleanApp = targetApp.lowercase().trim()
        val pm = context.packageManager

        val targetPackage = when {
            cleanApp.contains("phone") || cleanApp.contains("dialer") -> "com.google.android.dialer"
            cleanApp.contains("calc") -> "com.google.android.calculator"
            cleanApp.contains("youtube") -> "com.google.android.youtube"
            cleanApp.contains("spotify") -> "com.spotify.music"
            cleanApp.contains("keep") -> "com.google.android.keep"
            cleanApp.contains("whatsapp") -> "com.whatsapp"
            cleanApp.contains("chrome") -> "com.android.chrome"
            cleanApp.contains("camera") -> "com.google.android.GoogleCamera"
            cleanApp.contains("clock") -> "com.google.android.deskclock"
            cleanApp.contains("settings") -> "com.android.settings"
            else -> null
        }

        val launchIntent = if (targetPackage != null) {
            pm.getLaunchIntentForPackage(targetPackage)
        } else {
            Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
        }

        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launchIntent)
            return true
        }
        return false
    }

    @JavascriptInterface
    fun searchApp(targetApp: String, query: String): Boolean {
        val cleanApp = targetApp.lowercase().trim()
        val intent = when {
            cleanApp.contains("youtube") -> {
                Intent(Intent.ACTION_SEARCH).apply {
                    setPackage("com.google.android.youtube")
                    putExtra("query", query)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
            cleanApp.contains("spotify") -> {
                Intent(Intent.ACTION_VIEW, Uri.parse("spotify:search:\${Uri.encode(query)}")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
            cleanApp.contains("maps") -> {
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=\${Uri.encode(query)}")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
            else -> {
                Intent(Intent.ACTION_WEB_SEARCH).apply {
                    putExtra("query", query)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
            }
        }

        return try {
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun getContactsJson(): String {
        if (!hasContactsPermission()) return "[]"
        val array = JSONArray()
        val cursor = context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            ),
            null,
            null,
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
        )
        cursor?.use {
            val nameCol = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val numCol = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            var count = 0
            while (it.moveToNext() && count < 100) {
                val obj = JSONObject().apply {
                    put("name", it.getString(nameCol))
                    put("phoneNumber", it.getString(numCol))
                }
                array.put(obj)
                count++
            }
        }
        return array.toString()
    }

    @JavascriptInterface
    fun toggleFlashlight(enabled: Boolean): Boolean {
        return try {
            val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = cameraManager.cameraIdList[0]
            cameraManager.setTorchMode(cameraId, enabled)
            true
        } catch (e: Exception) {
            false
        }
    }
}
`,
  },
  {
    filename: 'LilaAccessibilityService.kt',
    language: 'kotlin',
    description: 'Accessibility Service for Calculator button tapping and Notepad text injection',
    code: `package com.lila.voice.companion

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Accessibility Service allowing Lila to tap buttons in Calculator and inject text into Notepad
 */
class LilaAccessibilityService : AccessibilityService() {

    companion object {
        var instance: LilaAccessibilityService? = null
    }

    private val handler = Handler(Looper.getMainLooper())

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

    override fun onInterrupt() {}

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) instance = null
    }

    /**
     * Step 3: Calculator Automation
     * Clicks number and operator buttons in order, then clicks '='
     */
    fun operateCalculator(expression: String): String {
        handler.postDelayed({
            val root = rootInActiveWindow ?: return@postDelayed
            val tokens = expression.replace(" ", "").toCharArray()

            for (token in tokens) {
                val label = when (token) {
                    '*', 'x', 'X' -> "×"
                    '/' -> "÷"
                    else -> token.toString()
                }
                clickButtonWithText(root, label)
                Thread.sleep(120) // Brief delay for calculator animation
            }
            clickButtonWithText(root, "=")
        }, 500)

        return "Computed $expression"
    }

    private fun clickButtonWithText(root: AccessibilityNodeInfo, text: String): Boolean {
        val nodes = root.findAccessibilityNodeInfosByText(text)
        for (node in nodes) {
            if (node.isClickable) {
                node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                return true
            }
            val parent = node.parent
            if (parent != null && parent.isClickable) {
                parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                return true
            }
        }
        return false
    }

    /**
     * Step 3: Notepad / Keep Text Injection
     */
    fun typeText(targetApp: String, text: String): Boolean {
        handler.postDelayed({
            val root = rootInActiveWindow ?: return@postDelayed
            val editable = findFirstEditableNode(root)
            if (editable != null) {
                val args = Bundle().apply {
                    putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
                }
                editable.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
        }, 600)
        return true
    }

    private fun findFirstEditableNode(node: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        if (node.isEditable) return node
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val editable = findFirstEditableNode(child)
            if (editable != null) return editable
        }
        return null
    }
}
`,
  },
  {
    filename: 'LilaNotificationListenerService.kt',
    language: 'kotlin',
    description: 'Notification Listener & MediaSessionManager for system-wide playback control',
    code: `package com.lila.voice.companion

import android.content.ComponentName
import android.content.Context
import android.media.AudioManager
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.service.notification.NotificationListenerService

/**
 * Step 2: System Media Transport Controls
 */
class LilaNotificationListenerService : NotificationListenerService() {

    companion object {
        var instance: LilaNotificationListenerService? = null
    }

    private lateinit var mediaSessionManager: MediaSessionManager
    private lateinit var audioManager: AudioManager

    override fun onCreate() {
        super.onCreate()
        instance = this
        mediaSessionManager = getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) instance = null
    }

    fun controlMedia(action: String): Boolean {
        return try {
            val component = ComponentName(this, LilaNotificationListenerService::class.java)
            val controllers = mediaSessionManager.getActiveSessions(component)

            if (controllers.isEmpty()) {
                // Fallback: system audio stream control
                when (action.lowercase()) {
                    "volume_up" -> audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                    "volume_down" -> audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
                }
                return true
            }

            val activeController = controllers.firstOrNull() ?: return false
            val transport = activeController.transportControls

            when (action.lowercase()) {
                "pause" -> transport.pause()
                "play", "resume" -> transport.play()
                "next" -> transport.skipToNext()
                "previous" -> transport.skipToPrevious()
                "volume_up" -> audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
                "volume_down" -> audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
            }
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
`,
  },
  {
    filename: 'MainActivity.kt',
    language: 'kotlin',
    description: 'Main Activity with WebView container and runtime permissions management',
    code: `package com.lila.voice.companion

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val PERMISSION_REQ_CODE = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()
        checkAndRequestPermissions()
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false

        webView.addJavascriptInterface(LilaWebBridgeInterface(this), "AndroidBridge")
        webView.addJavascriptInterface(LilaWebBridgeInterface(this), "LilaAndroidBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        webView.webViewClient = WebViewClient()
        // Load the AI Studio Build hosted URL or local asset
        webView.loadUrl("https://your-lila-app-url.run.app")
    }

    private fun checkAndRequestPermissions() {
        val permissionsNeeded = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.CALL_PHONE)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.READ_CONTACTS)
        }

        if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toTypedArray(), PERMISSION_REQ_CODE)
        }
    }
}
`,
  },
  {
    filename: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Manifest declaring CALL_PHONE, READ_CONTACTS, RECORD_AUDIO and background services',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.lila.voice.companion">

    <!-- Step 0 & 1: Required Permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.FLASHLIGHT" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Lila AI Voice Assistant"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Step 2: Media Session Notification Listener Service -->
        <service
            android:name=".LilaNotificationListenerService"
            android:exported="true"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- Step 3: Accessibility UI Automation Service (Calculator & Notepad) -->
        <service
            android:name=".LilaAccessibilityService"
            android:exported="true"
            android:label="Lila UI Companion Service"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

    </application>
</manifest>
`,
  },
  {
    filename: 'accessibility_service_config.xml',
    language: 'xml',
    description: 'Accessibility Service configuration for UI node inspection and text entry',
    code: `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged|typeViewClicked|typeViewFocused"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRetrieveInteractiveWindows|flagReportViewIds"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100" />
`,
  },
];
