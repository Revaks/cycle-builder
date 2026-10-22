# Keep kotlinx.serialization metadata for project JSON models.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class com.revaks.cyclebuilder.data.** {
    *** Companion;
}
-keepclasseswithmembers class com.revaks.cyclebuilder.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}
