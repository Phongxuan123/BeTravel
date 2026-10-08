#!/usr/bin/env bash
# Thao tac Android emulator nhu nguoi dung that: chup man hinh, doc cay UI, bam theo chu,
# go chu, doc log. Dung cho kiem thu thuc te (CLAUDE.md muc 5.1b), xem docs/EMULATOR_TESTING.md.

# Git Bash tu doi /sdcard/... thanh duong dan Windows; tat chuyen doi nay. UTF-8 de khop chu co dau.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' LC_ALL=C.UTF-8
SDK="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
ADB="$SDK/platform-tools/adb"
OUT="${EMU_SHOTS_DIR:-${TMPDIR:-/tmp}/betravel-shots}"
mkdir -p "$OUT"

dump() {
  "$ADB" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  "$ADB" exec-out cat /sdcard/ui.xml
}

# Bam BACK chi khi ban phim ao dang hien, tranh thoat khoi man hinh hien tai.
hide_keyboard() {
  "$ADB" shell dumpsys input_method | grep -q 'mInputShown=true' && "$ADB" shell input keyevent 4
  sleep 0.5
}

case "$1" in
  shot) "$ADB" exec-out screencap -p > "$OUT/$2.png" && echo "$OUT/$2.png" ;;
  # Liet ke phan tu co chu/mo ta kem tam toa do: "nhan | x y"
  ui) dump | tr '>' '\n' | grep -E 'bounds=' | while IFS= read -r node; do
        label=$(printf '%s' "$node" | sed -nE 's/.* text="([^"]+)".*/\1/p')
        [ -z "$label" ] && label=$(printf '%s' "$node" | sed -nE 's/.*content-desc="([^"]+)".*/\1/p')
        [ -z "$label" ] && continue
        printf '%s' "$node" | sed -nE 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]".*/\1 \2 \3 \4/p' \
          | awk -v l="$label" '{printf "%s | %d %d\n", l, ($1+$3)/2, ($2+$4)/2}'
      done ;;
  tap) "$ADB" shell input tap "$2" "$3" ;;
  # Bam vao phan tu dau tien co chu khop (khong phan biet hoa thuong)
  tapt) line=$("$0" ui | grep -iF -- "$2" | head -1)
        [ -z "$line" ] && { echo "KHONG THAY: $2"; exit 1; }
        xy=${line##*| }; "$ADB" shell input tap $xy; echo "tap $xy ($line)" ;;
  # Bam o nhap tai (x y), xoa noi dung cu, go chu moi roi an ban phim
  fill) "$ADB" shell input tap "$2" "$3"; sleep 0.5
        "$ADB" shell input keyevent 123
        "$ADB" shell input keyevent $(printf '67 %.0s' $(seq 1 60))
        "$ADB" shell input text "$(printf '%s' "$4" | sed 's/ /%s/g')"; hide_keyboard ;;
  type) "$ADB" shell input text "$(printf '%s' "$2" | sed 's/ /%s/g')" ;;
  hidekb) hide_keyboard ;;
  key) "$ADB" shell input keyevent "$2" ;;
  back) "$ADB" shell input keyevent 4 ;;
  swipe) "$ADB" shell input swipe "$2" "$3" "$4" "$5" "${6:-300}" ;;
  log) PID=$("$ADB" shell pidof com.betravel.dev | tr -d '\r')
       "$ADB" logcat -d -t "${2:-200}" --pid="$PID" | grep -E ' (E|W) |ReactNativeJS' ;;
  *) echo "usage: emu.sh shot NAME | ui | tap X Y | tapt TEXT | fill X Y TEXT | type TEXT"
     echo "               | hidekb | key CODE | back | swipe x1 y1 x2 y2 [ms] | log [N]" ;;
esac
