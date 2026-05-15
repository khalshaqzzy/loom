#pragma once

#include <Arduino.h>

namespace loom {

inline bool isCanonicalMessageValue(const char* value) {
  if (value == nullptr || value[0] == '\0') return false;
  return strcmp(value, "fine") == 0 ||
         strcmp(value, "needs_rescue") == 0 ||
         strcmp(value, "medical_help") == 0 ||
         strcmp(value, "food_water") == 0 ||
         strcmp(value, "shelter_needed") == 0 ||
         strcmp(value, "trapped") == 0 ||
         strcmp(value, "danger") == 0 ||
         strcmp(value, "unknown") == 0;
}

inline bool isSafeMessageValue(const char* value) {
  return value != nullptr && strcmp(value, "fine") == 0;
}

inline bool copyCanonicalMessage(const char* source, char* target, size_t targetSize) {
  if (!isCanonicalMessageValue(source) || targetSize == 0) return false;
  size_t len = strlen(source);
  if (len >= targetSize) return false;
  memcpy(target, source, len + 1);
  return true;
}

}
