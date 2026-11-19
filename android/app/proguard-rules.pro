# React Native rules
-keep public class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# RS485 JNI SerialPort rules
-keep class android_serialport_api.** { *; }
-keepclassmembers class android_serialport_api.** { *; }
-keepclasseswithmembernames class * {
    native <methods>;
}
