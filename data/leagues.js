/*
 * BasketballLife league and schedule data.
 *
 * This file intentionally uses a global instead of ES modules for the first
 * migration step. The current game is a classic-script application, so this
 * keeps file:// previews and existing saves working while moving data out of
 * index.html.
 */
window.BL_LEAGUE_CFG = {
  "SBL／半職業": {label:"SBL", target:58, market:54, strength:.78, salary:120, games:[30,30], award:0, exposure:0, trait:"半職業聯賽"},
  "台灣職業": {label:"台灣職籃", target:69, market:67, strength:.96, salary:520, games:[36,36], award:1, exposure:1, trait:"台灣職業聯賽"},
  "韓國職業": {label:"韓國職籃", target:76, market:74, strength:1.08, salary:1600, games:[54,54], award:4, exposure:2, trait:"外援競爭"},
  "日本職業": {label:"日本職籃", target:80, market:78, strength:1.20, salary:2000, games:[60,60], award:6, exposure:4, trait:"穩定長約"},
  "CBA": {label:"CBA", target:81, market:79, strength:1.22, salary:3500, games:[42,42], award:7, exposure:4, trait:"高薪市場"},
  "NBA G League": {label:"NBA G League", target:82, market:80, strength:1.21, salary:160, games:[50,50], award:7, exposure:10, trait:"NBA跳板"},
  "歐洲聯賽": {label:"歐洲聯賽", target:86, market:85, strength:1.38, salary:6200, games:[38,38], award:10, exposure:8, trait:"歐洲頂級舞台"},
  "NBA": {label:"NBA", target:91, market:90, strength:1.56, salary:12000, games:[82,82], award:13, exposure:10, trait:"最高舞台"}
};

window.BL_STUDENT_SCHEDULES = {
  "HBL":[18,24], "UBA":[20,26], "UBA 強權":[22,28],
  "日本大學":[24,30], "NCAA D2":[26,30], "NCAA D1":[29,31]
};
