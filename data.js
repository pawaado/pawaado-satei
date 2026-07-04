const SKILLS = [
  {
    "no": 1,
    "name": "物理攻撃○",
    "requires": "",
    "cost": {
      "muscle": 190,
      "agility": 15,
      "tech": 65,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 135,
    "appraisalLabel": "135",
    "note": ""
  },
  {
    "no": 2,
    "name": "物理攻撃◎",
    "requires": "物理攻撃○",
    "cost": {
      "muscle": 285,
      "agility": 22,
      "tech": 98,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 3,
    "name": "魔法攻撃○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 30,
      "intellect": 170,
      "spirit": 70
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 4,
    "name": "魔法攻撃◎",
    "requires": "魔法攻撃○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 45,
      "intellect": 255,
      "spirit": 105
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 5,
    "name": "物理防御○",
    "requires": "",
    "cost": {
      "muscle": 90,
      "agility": 150,
      "tech": 0,
      "intellect": 0,
      "spirit": 35
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 6,
    "name": "物理防御◎",
    "requires": "物理防御○",
    "cost": {
      "muscle": 135,
      "agility": 225,
      "tech": 0,
      "intellect": 0,
      "spirit": 45
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 7,
    "name": "魔法防御○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 150,
      "tech": 0,
      "intellect": 70,
      "spirit": 55
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 8,
    "name": "魔法防御◎",
    "requires": "魔法防御○",
    "cost": {
      "muscle": 0,
      "agility": 225,
      "tech": 0,
      "intellect": 105,
      "spirit": 75
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 9,
    "name": "体幹",
    "requires": "",
    "cost": {
      "muscle": 230,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 60
    },
    "appraisal": 160,
    "appraisalLabel": "160",
    "note": ""
  },
  {
    "no": 10,
    "name": "魔力制御",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 0,
      "intellect": 230,
      "spirit": 60
    },
    "appraisal": 70,
    "appraisalLabel": "70",
    "note": ""
  },
  {
    "no": 11,
    "name": "忍耐",
    "requires": "",
    "cost": {
      "muscle": 170,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 120
    },
    "appraisal": null,
    "appraisalLabel": "調査中",
    "note": ""
  },
  {
    "no": 12,
    "name": "生存本能",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 110,
      "tech": 0,
      "intellect": 25,
      "spirit": 170
    },
    "appraisal": null,
    "appraisalLabel": "調査中",
    "note": ""
  },
  {
    "no": 13,
    "name": "闘争本能",
    "requires": "",
    "cost": {
      "muscle": 80,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 225
    },
    "appraisal": 135,
    "appraisalLabel": "135",
    "note": ""
  },
  {
    "no": 14,
    "name": "柔軟な体",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 110,
      "tech": 140,
      "intellect": 35,
      "spirit": 0
    },
    "appraisal": 280,
    "appraisalLabel": "280",
    "note": ""
  },
  {
    "no": 15,
    "name": "頑丈な体",
    "requires": "",
    "cost": {
      "muscle": 175,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 110
    },
    "appraisal": null,
    "appraisalLabel": "調査中",
    "note": ""
  },
  {
    "no": 16,
    "name": "無心の構え",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 60,
      "tech": 30,
      "intellect": 0,
      "spirit": 195
    },
    "appraisal": 280,
    "appraisalLabel": "280",
    "note": ""
  },
  {
    "no": 17,
    "name": "護身の構え",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 110,
      "tech": 105,
      "intellect": 0,
      "spirit": 70
    },
    "appraisal": null,
    "appraisalLabel": "調査中",
    "note": ""
  },
  {
    "no": 18,
    "name": "狙い撃ち",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 195,
      "intellect": 0,
      "spirit": 95
    },
    "appraisal": 60,
    "appraisalLabel": "60",
    "note": ""
  },
  {
    "no": 19,
    "name": "運任せ",
    "requires": "",
    "cost": {
      "muscle": 150,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 99
    },
    "appraisal": 150,
    "appraisalLabel": "150",
    "note": ""
  },
  {
    "no": 20,
    "name": "●攻撃",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 180,
      "intellect": 40,
      "spirit": 60
    },
    "appraisal": 135,
    "appraisalLabel": "135",
    "note": ""
  },
  {
    "no": 21,
    "name": "火耐性",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 120,
      "tech": 60,
      "intellect": 0,
      "spirit": 100
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 22,
    "name": "風耐性",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 120,
      "tech": 60,
      "intellect": 0,
      "spirit": 100
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 23,
    "name": "水耐性",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 120,
      "tech": 60,
      "intellect": 0,
      "spirit": 100
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 24,
    "name": "無耐性",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 120,
      "tech": 60,
      "intellect": 0,
      "spirit": 100
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 25,
    "name": "通常攻撃○",
    "requires": "",
    "cost": {
      "muscle": 95,
      "agility": 75,
      "tech": 90,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 156,
    "appraisalLabel": "156",
    "note": ""
  },
  {
    "no": 26,
    "name": "通常攻撃◎",
    "requires": "通常攻撃○",
    "cost": {
      "muscle": 143,
      "agility": 112,
      "tech": 135,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 104,
    "appraisalLabel": "104",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 27,
    "name": "アクションスキル○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 90,
      "tech": 170,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 144,
    "appraisalLabel": "144",
    "note": ""
  },
  {
    "no": 28,
    "name": "アクションスキル◎",
    "requires": "アクションスキル○",
    "cost": {
      "muscle": 0,
      "agility": 135,
      "tech": 255,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 96,
    "appraisalLabel": "96",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 29,
    "name": "単体攻撃○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 60,
      "intellect": 0,
      "spirit": 200
    },
    "appraisal": 135,
    "appraisalLabel": "135",
    "note": ""
  },
  {
    "no": 30,
    "name": "単体攻撃◎",
    "requires": "単体攻撃○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 90,
      "intellect": 0,
      "spirit": 300
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 31,
    "name": "列攻撃○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 160,
      "tech": 50,
      "intellect": 50,
      "spirit": 0
    },
    "appraisal": 99,
    "appraisalLabel": "99",
    "note": ""
  },
  {
    "no": 32,
    "name": "列攻撃◎",
    "requires": "列攻撃○",
    "cost": {
      "muscle": 0,
      "agility": 240,
      "tech": 75,
      "intellect": 75,
      "spirit": 0
    },
    "appraisal": 66,
    "appraisalLabel": "66",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 33,
    "name": "追撃○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 130,
      "tech": 130,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 39,
    "appraisalLabel": "39",
    "note": ""
  },
  {
    "no": 34,
    "name": "追撃◎",
    "requires": "追撃○",
    "cost": {
      "muscle": 0,
      "agility": 195,
      "tech": 195,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 26,
    "appraisalLabel": "26",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 35,
    "name": "がむしゃら",
    "requires": "",
    "cost": {
      "muscle": 177,
      "agility": 0,
      "tech": 0,
      "intellect": 33,
      "spirit": 55
    },
    "appraisal": 35,
    "appraisalLabel": "35",
    "note": ""
  },
  {
    "no": 36,
    "name": "ケガしにくさ○",
    "requires": "",
    "cost": {
      "muscle": 190,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 80
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 37,
    "name": "ケガしにくさ◎",
    "requires": "ケガしにくさ○",
    "cost": {
      "muscle": 285,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 120
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 38,
    "name": "防御態勢",
    "requires": "",
    "cost": {
      "muscle": 155,
      "agility": 135,
      "tech": 0,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 39,
    "name": "備え",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 60,
      "intellect": 90,
      "spirit": 140
    },
    "appraisal": 100,
    "appraisalLabel": "100",
    "note": ""
  },
  {
    "no": 40,
    "name": "広い視野",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 170,
      "tech": 0,
      "intellect": 60,
      "spirit": 60
    },
    "appraisal": 100,
    "appraisalLabel": "100",
    "note": ""
  },
  {
    "no": 41,
    "name": "見切り",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 65,
      "tech": 95,
      "intellect": 130,
      "spirit": 0
    },
    "appraisal": 72,
    "appraisalLabel": "72",
    "note": ""
  },
  {
    "no": 42,
    "name": "危機察知",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 120,
      "tech": 50,
      "intellect": 115,
      "spirit": 0
    },
    "appraisal": 132,
    "appraisalLabel": "132",
    "note": ""
  },
  {
    "no": 43,
    "name": "力学の理解",
    "requires": "",
    "cost": {
      "muscle": 80,
      "agility": 0,
      "tech": 0,
      "intellect": 230,
      "spirit": 0
    },
    "appraisal": 280,
    "appraisalLabel": "280",
    "note": ""
  },
  {
    "no": 44,
    "name": "魔法の理解",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 0,
      "intellect": 310,
      "spirit": 0
    },
    "appraisal": 280,
    "appraisalLabel": "280",
    "note": ""
  },
  {
    "no": 45,
    "name": "免疫強化",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 70,
      "tech": 0,
      "intellect": 86,
      "spirit": 104
    },
    "appraisal": 40,
    "appraisalLabel": "40",
    "note": ""
  },
  {
    "no": 46,
    "name": "意志",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 0,
      "intellect": 14,
      "spirit": 246
    },
    "appraisal": 40,
    "appraisalLabel": "40",
    "note": ""
  },
  {
    "no": 47,
    "name": "ガッツ",
    "requires": "",
    "cost": {
      "muscle": 14,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 246
    },
    "appraisal": 40,
    "appraisalLabel": "40",
    "note": ""
  },
  {
    "no": 48,
    "name": "対剣士○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 90,
      "tech": 0,
      "intellect": 170,
      "spirit": 10
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 49,
    "name": "対剣士◎",
    "requires": "対剣士○",
    "cost": {
      "muscle": 0,
      "agility": 135,
      "tech": 0,
      "intellect": 255,
      "spirit": 15
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 50,
    "name": "対魔闘士○",
    "requires": "",
    "cost": {
      "muscle": 25,
      "agility": 40,
      "tech": 0,
      "intellect": 0,
      "spirit": 205
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 51,
    "name": "対魔闘士◎",
    "requires": "対魔闘士○",
    "cost": {
      "muscle": 37,
      "agility": 60,
      "tech": 0,
      "intellect": 0,
      "spirit": 308
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 52,
    "name": "対重戦士○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 115,
      "tech": 107,
      "intellect": 0,
      "spirit": 48
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 53,
    "name": "対重戦士◎",
    "requires": "対重戦士○",
    "cost": {
      "muscle": 0,
      "agility": 173,
      "tech": 160,
      "intellect": 0,
      "spirit": 72
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 54,
    "name": "対弓使い○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 205,
      "tech": 0,
      "intellect": 0,
      "spirit": 65
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 55,
    "name": "対弓使い◎",
    "requires": "対弓使い○",
    "cost": {
      "muscle": 0,
      "agility": 308,
      "tech": 0,
      "intellect": 0,
      "spirit": 97
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 56,
    "name": "対魔法使い○",
    "requires": "",
    "cost": {
      "muscle": 170,
      "agility": 30,
      "tech": 0,
      "intellect": 0,
      "spirit": 70
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 57,
    "name": "対魔法使い◎",
    "requires": "対魔法使い○",
    "cost": {
      "muscle": 255,
      "agility": 45,
      "tech": 0,
      "intellect": 0,
      "spirit": 105
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 58,
    "name": "対僧侶○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 102,
      "tech": 92,
      "intellect": 76,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 59,
    "name": "対僧侶◎",
    "requires": "対僧侶○",
    "cost": {
      "muscle": 0,
      "agility": 153,
      "tech": 138,
      "intellect": 114,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 60,
    "name": "対ゴブリン○",
    "requires": "",
    "cost": {
      "muscle": 95,
      "agility": 0,
      "tech": 80,
      "intellect": 80,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 61,
    "name": "対ゴブリン◎",
    "requires": "対ゴブリン○",
    "cost": {
      "muscle": 143,
      "agility": 0,
      "tech": 120,
      "intellect": 120,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 62,
    "name": "対オーク○",
    "requires": "",
    "cost": {
      "muscle": 220,
      "agility": 35,
      "tech": 0,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 63,
    "name": "対オーク◎",
    "requires": "対オーク○",
    "cost": {
      "muscle": 330,
      "agility": 53,
      "tech": 0,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 64,
    "name": "対サイクロプス○",
    "requires": "",
    "cost": {
      "muscle": 80,
      "agility": 125,
      "tech": 0,
      "intellect": 50,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 65,
    "name": "対サイクロプス◎",
    "requires": "対サイクロプス○",
    "cost": {
      "muscle": 120,
      "agility": 188,
      "tech": 0,
      "intellect": 75,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 66,
    "name": "対ヌメリン○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 30,
      "tech": 17,
      "intellect": 208,
      "spirit": 0
    },
    "appraisal": 9,
    "appraisalLabel": "9",
    "note": ""
  },
  {
    "no": 67,
    "name": "対ヌメリン◎",
    "requires": "対ヌメリン○",
    "cost": {
      "muscle": 0,
      "agility": 45,
      "tech": 26,
      "intellect": 312,
      "spirit": 0
    },
    "appraisal": 4,
    "appraisalLabel": "4",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 68,
    "name": "対キラービー○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 160,
      "tech": 20,
      "intellect": 0,
      "spirit": 75
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 69,
    "name": "対キラービー◎",
    "requires": "対キラービー○",
    "cost": {
      "muscle": 0,
      "agility": 240,
      "tech": 30,
      "intellect": 0,
      "spirit": 113
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 70,
    "name": "対ピクシー○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 61,
      "tech": 61,
      "intellect": 0,
      "spirit": 133
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 71,
    "name": "対ピクシー◎",
    "requires": "対ピクシー○",
    "cost": {
      "muscle": 0,
      "agility": 92,
      "tech": 92,
      "intellect": 0,
      "spirit": 199
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 72,
    "name": "対ハーピー○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 140,
      "tech": 70,
      "intellect": 0,
      "spirit": 45
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 73,
    "name": "対ハーピー◎",
    "requires": "対ハーピー○",
    "cost": {
      "muscle": 0,
      "agility": 210,
      "tech": 105,
      "intellect": 0,
      "spirit": 68
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 74,
    "name": "対スケルトン○",
    "requires": "",
    "cost": {
      "muscle": 110,
      "agility": 10,
      "tech": 0,
      "intellect": 0,
      "spirit": 135
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 75,
    "name": "対スケルトン◎",
    "requires": "対スケルトン○",
    "cost": {
      "muscle": 165,
      "agility": 15,
      "tech": 0,
      "intellect": 0,
      "spirit": 203
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 76,
    "name": "対ラミア○",
    "requires": "",
    "cost": {
      "muscle": 95,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 160
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 77,
    "name": "対ラミア◎",
    "requires": "対ラミア○",
    "cost": {
      "muscle": 143,
      "agility": 0,
      "tech": 0,
      "intellect": 0,
      "spirit": 240
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 78,
    "name": "対ウンディーネ○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 55,
      "tech": 0,
      "intellect": 120,
      "spirit": 80
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 79,
    "name": "対ウンディーネ◎",
    "requires": "対ウンディーネ○",
    "cost": {
      "muscle": 0,
      "agility": 83,
      "tech": 0,
      "intellect": 180,
      "spirit": 120
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 80,
    "name": "対フィッシュ○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 231,
      "tech": 24,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 81,
    "name": "対フィッシュ◎",
    "requires": "対フィッシュ○",
    "cost": {
      "muscle": 0,
      "agility": 347,
      "tech": 36,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 82,
    "name": "対妖狐○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 105,
      "tech": 150,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 83,
    "name": "対妖狐◎",
    "requires": "対妖狐○",
    "cost": {
      "muscle": 0,
      "agility": 158,
      "tech": 225,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 84,
    "name": "対ドラゴンタートル○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 45,
      "tech": 0,
      "intellect": 210,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 85,
    "name": "対ドラゴンタートル◎",
    "requires": "対ドラゴンタートル○",
    "cost": {
      "muscle": 0,
      "agility": 68,
      "tech": 0,
      "intellect": 315,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 86,
    "name": "対植物○",
    "requires": "",
    "cost": {
      "muscle": 77,
      "agility": 77,
      "tech": 101,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 90,
    "appraisalLabel": "90",
    "note": ""
  },
  {
    "no": 87,
    "name": "対植物◎",
    "requires": "対植物○",
    "cost": {
      "muscle": 116,
      "agility": 116,
      "tech": 151,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 45,
    "appraisalLabel": "45",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 88,
    "name": "回復効果○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 105,
      "intellect": 150,
      "spirit": 150
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 89,
    "name": "回復効果◎",
    "requires": "回復効果○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 70,
      "intellect": 100,
      "spirit": 100
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 90,
    "name": "癒やしの心",
    "requires": "",
    "cost": {
      "muscle": 120,
      "agility": 0,
      "tech": 50,
      "intellect": 140,
      "spirit": 0
    },
    "appraisal": null,
    "appraisalLabel": "調査中",
    "note": ""
  },
  {
    "no": 91,
    "name": "ヒーラー魂",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 100,
      "tech": 50,
      "intellect": 0,
      "spirit": 99
    },
    "appraisal": -70,
    "appraisalLabel": "-70",
    "note": ""
  },
  {
    "no": 92,
    "name": "慈しみ",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 64,
      "tech": 0,
      "intellect": 88,
      "spirit": 123
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 93,
    "name": "集中力",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 53,
      "intellect": 50,
      "spirit": 172
    },
    "appraisal": 60,
    "appraisalLabel": "60",
    "note": ""
  },
  {
    "no": 94,
    "name": "協調性",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 102,
      "intellect": 82,
      "spirit": 91
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 95,
    "name": "バランス感覚",
    "requires": "",
    "cost": {
      "muscle": 102,
      "agility": 112,
      "tech": 61,
      "intellect": 0,
      "spirit": 0
    },
    "appraisal": 100,
    "appraisalLabel": "100",
    "note": ""
  },
  {
    "no": 96,
    "name": "お人よし",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 0,
      "intellect": 83,
      "spirit": 192
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 97,
    "name": "立て直し",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 83,
      "tech": 62,
      "intellect": 0,
      "spirit": 130
    },
    "appraisal": 66,
    "appraisalLabel": "66",
    "note": ""
  },
  {
    "no": 98,
    "name": "仲間思い",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 39,
      "tech": 0,
      "intellect": 72,
      "spirit": 164
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 99,
    "name": "冷静沈着",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 62,
      "intellect": 33,
      "spirit": 180
    },
    "appraisal": 140,
    "appraisalLabel": "140",
    "note": ""
  },
  {
    "no": 100,
    "name": "戦況分析",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 35,
      "tech": 62,
      "intellect": 178,
      "spirit": 0
    },
    "appraisal": 100,
    "appraisalLabel": "100",
    "note": ""
  },
  {
    "no": 101,
    "name": "火回復",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 62,
      "intellect": 120,
      "spirit": 98
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 102,
    "name": "風回復",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 62,
      "intellect": 120,
      "spirit": 98
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 103,
    "name": "水回復",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 62,
      "intellect": 120,
      "spirit": 98
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 104,
    "name": "通常回復○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 22,
      "intellect": 119,
      "spirit": 119
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 105,
    "name": "通常回復◎",
    "requires": "通常回復○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 34,
      "intellect": 178,
      "spirit": 178
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 106,
    "name": "単体回復○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 48,
      "tech": 0,
      "intellect": 120,
      "spirit": 92
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 107,
    "name": "単体回復◎",
    "requires": "単体回復○",
    "cost": {
      "muscle": 0,
      "agility": 72,
      "tech": 0,
      "intellect": 180,
      "spirit": 138
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 108,
    "name": "列回復○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 68,
      "intellect": 81,
      "spirit": 111
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 109,
    "name": "列回復◎",
    "requires": "列回復○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 102,
      "intellect": 122,
      "spirit": 166
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 110,
    "name": "剣士治療○",
    "requires": "",
    "cost": {
      "muscle": 50,
      "agility": 0,
      "tech": 110,
      "intellect": 110,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 111,
    "name": "剣士治療◎",
    "requires": "剣士治療○",
    "cost": {
      "muscle": 75,
      "agility": 0,
      "tech": 165,
      "intellect": 165,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 112,
    "name": "魔闘士治療○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 110,
      "intellect": 110,
      "spirit": 50
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 113,
    "name": "魔闘士治療◎",
    "requires": "魔闘士治療○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 165,
      "intellect": 165,
      "spirit": 75
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 114,
    "name": "重戦士治療○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 50,
      "tech": 110,
      "intellect": 110,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 115,
    "name": "重戦士治療◎",
    "requires": "重戦士治療○",
    "cost": {
      "muscle": 0,
      "agility": 75,
      "tech": 165,
      "intellect": 165,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 116,
    "name": "弓使い治療○",
    "requires": "",
    "cost": {
      "muscle": 50,
      "agility": 0,
      "tech": 110,
      "intellect": 110,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 117,
    "name": "弓使い治療◎",
    "requires": "弓使い治療○",
    "cost": {
      "muscle": 75,
      "agility": 0,
      "tech": 165,
      "intellect": 165,
      "spirit": 0
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 118,
    "name": "魔法使い治療○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 110,
      "intellect": 110,
      "spirit": 50
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 119,
    "name": "魔法使い治療◎",
    "requires": "魔法使い治療○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 165,
      "intellect": 165,
      "spirit": 75
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  },
  {
    "no": 120,
    "name": "僧侶治療○",
    "requires": "",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 110,
      "intellect": 110,
      "spirit": 50
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": ""
  },
  {
    "no": 121,
    "name": "僧侶治療◎",
    "requires": "僧侶治療○",
    "cost": {
      "muscle": 0,
      "agility": 0,
      "tech": 165,
      "intellect": 165,
      "spirit": 75
    },
    "appraisal": 0,
    "appraisalLabel": "0",
    "note": "◎は○取得後。コツは○/◎両方に適用"
  }
];
