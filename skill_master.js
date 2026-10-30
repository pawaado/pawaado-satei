/*
 * 必殺技・アクションスキル・超特殊能力のデータ正本。
 * jobs: 取得可能ジョブ / attribute: 属性（nullは全属性）
 * levels[].condition: 修得条件 / levels[].tip: 登録されたコツLv
 * levels[].cost: そのLvの追加経験点 [筋力,敏捷,技術,知力,精神]
 * levels[].scores[ジョブ]: [追加査定, 累計査定]
 * lowerAbilities: 下位特殊能力名の配列。必要な○は◎の前提能力を自動追跡。
 *   例: "lowerAbilities": ["ケガしにくさ◎"]
 *   新しい超特殊能力のデータにこれを指定すれば、Lv.累計に(下位能力込み)を自動追加。
 *   下位能力は data.js の special 欄からコツなしで取得。超特はコツLv.1。
 * ※ HP依存スキルの固定査定はnull（別途HPで計算）。
 */
window.PAWAADO_DATA.skillRankings = {
  "version": "2026-10-31-orb-fire-generic-actions",
  "description": "元画像・過去会話から統合されたスキルマスターを基に作成。レベル別費用は表示コツ時点の値。",
  "skills": [
    {
      "name": "ファイアオーブ",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            135,
            240,
            85
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "オーブストライカー": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            169,
            300,
            106
          ],
          "tip": 0,
          "condition": "魔力40以上",
          "scores": {
            "オーブストライカー": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "メテオパワー",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            67,
            234,
            0,
            159
          ],
          "tip": 0,
          "condition": "精神力20以上",
          "scores": {
            "オーブストライカー": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            84,
            293,
            0,
            198
          ],
          "tip": 0,
          "condition": "精神力40以上",
          "scores": {
            "オーブストライカー": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "クアッドイグニッション",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            77,
            128,
            64
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "オーブストライカー": [
              1500,
              1500
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            99,
            165,
            82
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "オーブストライカー": [
              900,
              2400
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            0,
            0,
            341,
            568,
            284
          ],
          "tip": 1,
          "condition": "器用さ80以上",
          "scores": {
            "オーブストライカー": [
              900,
              3300
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "プロミネンスタックル",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            63,
            126,
            95,
            63
          ],
          "tip": 1,
          "condition": "魔力20以上・器用さ20以上",
          "scores": {
            "オーブストライカー": [
              2000,
              2000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            97,
            194,
            145,
            97
          ],
          "tip": 1,
          "condition": "魔力50以上・器用さ50以上",
          "scores": {
            "オーブストライカー": [
              1600,
              3600
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            0,
            292,
            583,
            437,
            292
          ],
          "tip": 1,
          "condition": "魔力70以上・器用さ70以上",
          "scores": {
            "オーブストライカー": [
              1600,
              5200
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "パワーコンバージョン",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            62,
            139,
            0,
            91
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "オーブストライカー": [
              1000,
              1000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            84,
            191,
            0,
            124
          ],
          "tip": 0,
          "condition": "器用さ40以上",
          "scores": {
            "オーブストライカー": [
              575,
              1575
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ヴォルテックスオーブ",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "オーブストライカー"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            40,
            110,
            142,
            0
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "オーブストライカー": [
              1000,
              1000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            54,
            151,
            194,
            0
          ],
          "tip": 0,
          "condition": "魔力40以上",
          "scores": {
            "オーブストライカー": [
              575,
              1575
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "水斬撃",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            221,
            79,
            125,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "剣士": [
              600,
              600
            ],
            "双剣士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "スラッシュ",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            155,
            44,
            67,
            0,
            0
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "剣士": [
              900,
              900
            ],
            "双剣士": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双水斬",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            240,
            85,
            135,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            300,
            106,
            169,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双風斬",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            240,
            85,
            135,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            300,
            106,
            169,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "トレブルスラッシュ",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            142,
            40,
            110,
            0,
            0
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "双剣士": [
              1000,
              1000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            194,
            54,
            151,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー40以上",
          "scores": {
            "双剣士": [
              575,
              1575
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "カウンターエッジ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            79,
            31,
            132,
            0,
            105
          ],
          "tip": 1,
          "condition": "生命力20・器用さ20以上",
          "scores": {
            "双剣士": [
              2000,
              2000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            121,
            48,
            203,
            0,
            161
          ],
          "tip": 1,
          "condition": "生命力50・器用さ50以上",
          "scores": {
            "双剣士": [
              1600,
              3600
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            364,
            146,
            608,
            0,
            486
          ],
          "tip": 1,
          "condition": "生命力70・器用さ70以上",
          "scores": {
            "双剣士": [
              1600,
              5200
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "水刃四連斬",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            54,
            26,
            188,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "双剣士": [
              1500,
              1500
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            69,
            34,
            242,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "双剣士": [
              900,
              2400
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            239,
            119,
            836,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ80以上",
          "scores": {
            "双剣士": [
              900,
              3300
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双水の構え",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            67,
            234,
            0,
            159
          ],
          "tip": 0,
          "condition": "精神力20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            84,
            293,
            0,
            198
          ],
          "tip": 0,
          "condition": "精神力40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双風の構え",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            67,
            234,
            0,
            159
          ],
          "tip": 0,
          "condition": "精神力20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            84,
            293,
            0,
            198
          ],
          "tip": 0,
          "condition": "精神力40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双炎の構え",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            67,
            234,
            0,
            159
          ],
          "tip": 0,
          "condition": "精神力20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            84,
            293,
            0,
            198
          ],
          "tip": 0,
          "condition": "精神力40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "真空斬り",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            221,
            79,
            125,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "剣士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "光の太刀",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            56,
            198,
            94,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "双剣士": [
              2000,
              2000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            86,
            303,
            144,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー50・器用さ50以上",
          "scores": {
            "双剣士": [
              1600,
              3600
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            258,
            911,
            435,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー70・器用さ70以上",
          "scores": {
            "双剣士": [
              1600,
              5200
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ブレイブストライク",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            140,
            0,
            83,
            0,
            45
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "双剣士": [
              1500,
              1500
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            180,
            0,
            107,
            0,
            58
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "双剣士": [
              900,
              2400
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            621,
            0,
            370,
            0,
            203
          ],
          "tip": 1,
          "condition": "パワー80以上",
          "scores": {
            "双剣士": [
              900,
              3300
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "双翼の舞",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            91,
            139,
            0,
            62
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "双剣士": [
              1000,
              1000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            124,
            191,
            0,
            84
          ],
          "tip": 0,
          "condition": "器用さ40以上",
          "scores": {
            "双剣士": [
              575,
              1575
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    // 2026-10-29 再照合: 双炎斬は双剣士専用・火属性。能力Lv.1/2の2段階を持つ。
    // Lv.1: パワー20以上、必要経験点[240,85,135,0,0]、査定+650。
    // Lv.2: パワー40以上、追加経験点[300,106,169,0,0]、追加査定+400（累計+1050）。
    {
      "name": "双炎斬",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            240,
            85,
            135,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "双剣士": [
              650,
              650
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            300,
            106,
            169,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー40以上",
          "scores": {
            "双剣士": [
              400,
              1050
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "パニックストーム",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            56,
            0,
            94,
            0,
            198
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "双剣士": [
              2000,
              2000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            86,
            0,
            144,
            0,
            303
          ],
          "tip": 1,
          "condition": "パワー50・器用さ50以上",
          "scores": {
            "双剣士": [
              1600,
              3600
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            220,
            0,
            370,
            0,
            774
          ],
          "tip": 1,
          "condition": "パワー70・器用さ70以上",
          "scores": {
            "双剣士": [
              1600,
              5200
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "爆炎一閃",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            147,
            44,
            88,
            0,
            44
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1860,
              1860
            ],
            "双剣士": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            221,
            66,
            132,
            0,
            66
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              1390,
              3250
            ],
            "双剣士": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "火連斬",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            118,
            26,
            71,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            142,
            31,
            85,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "剣豪の構え",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            43,
            0,
            75,
            0,
            97
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            52,
            0,
            91,
            0,
            117
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "火炎斬り",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            221,
            79,
            125,
            0,
            0
          ],
          "tip": 0,
          "condition": "パワー20以上",
          "scores": {
            "剣士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "テンペストスイープ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            127,
            25,
            76,
            0,
            50
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1600,
              1600
            ],
            "双剣士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            189,
            38,
            113,
            0,
            75
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              1200,
              2800
            ],
            "双剣士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "疾風一閃",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            51,
            86,
            93,
            0,
            49
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "剣士": [
              1600,
              1600
            ],
            "双剣士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            75,
            129,
            137,
            0,
            74
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              1200,
              2800
            ],
            "双剣士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "疾風斬",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            67,
            14,
            40,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            146,
            32,
            87,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "心眼剣誓",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            53,
            48,
            113,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            65,
            56,
            137,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "アクアヒール",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "僧侶"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "僧侶": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ファイアヒール",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "僧侶"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "僧侶": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "キュアライズサークル",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            29,
            88,
            147,
            59
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            44,
            133,
            221,
            88
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "メガヒール",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "僧侶"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            0,
            89,
            177
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "僧侶": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "生命の息吹",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            0,
            103,
            26
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            104,
            0,
            124,
            31
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ルミナスオーラ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            63,
            152,
            0,
            0,
            63
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            94,
            226,
            0,
            0,
            94
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "巨岩投炎撃",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            88,
            118,
            59,
            0,
            59
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            132,
            177,
            88,
            0,
            88
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "守りの態勢",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "重戦士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            177,
            0,
            0,
            89
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "重戦士": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ガイアプロテクト",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            95,
            114,
            21,
            0,
            48
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            141,
            170,
            31,
            0,
            72
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "烈風震破",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            60,
            129,
            0,
            0,
            26
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            72,
            155,
            0,
            0,
            31
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "虚弱の風",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            60,
            129,
            26
          ],
          "tip": 1,
          "condition": "耐久力20・精神力20以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            72,
            155,
            31
          ],
          "tip": 1,
          "condition": "耐久力50・精神力40以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ブラストフォール",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            60,
            129,
            26
          ],
          "tip": 1,
          "condition": "耐久力20・精神力20以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            72,
            155,
            31
          ],
          "tip": 1,
          "condition": "耐久力50・精神力40以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ウォークライ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            102,
            51,
            0,
            61
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            123,
            62,
            0,
            74
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マジカルウォーター",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔法使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ファイアウィンド",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔法使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "アイシクルブレイク",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            110,
            73,
            32
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            132,
            87,
            39
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "アクアブラスト",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            69,
            108,
            39
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            83,
            130,
            46
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マジックファイア",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            64,
            118,
            32
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            77,
            143,
            39
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "エクスプロージョン",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            27,
            57,
            127,
            67
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            41,
            85,
            189,
            100
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ポイズンドロップ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            82,
            102,
            31
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            99,
            123,
            37
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ルミナスフレイム",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            32,
            97,
            129,
            65
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            49,
            145,
            194,
            97
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ジャグリングマジック",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            45,
            52,
            115,
            136
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              2000,
              2000
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            69,
            80,
            176,
            208
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1600,
              3600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "カースウィンド",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            11,
            43,
            161
          ],
          "tip": 1,
          "condition": "魔力20以上・精神力20以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            13,
            52,
            194
          ],
          "tip": 1,
          "condition": "魔力50以上・精神力40以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ウィンド",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔法使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マジックフォーカス",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "魔法使い"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            37,
            110,
            49
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "魔法使い": [
              450,
              450
            ]
          },
          "effect": {
            "単体攻撃倍率": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            47,
            123,
            57
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "魔法使い": [
              360,
              810
            ]
          },
          "effect": {
            "単体攻撃倍率": 18
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null,
      "jobFamily": "魔法使い系統"
    },
    {
      "name": "レインバーン",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            76,
            63,
            84,
            55,
            0
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            113,
            94,
            126,
            82,
            0
          ],
          "tip": 1,
          "condition": "パワー40・器用さ50以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "蒼炎の弓矢",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            111,
            52,
            124,
            37,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            167,
            78,
            186,
            55,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ブレイズスナイプ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            69,
            118,
            28,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            83,
            142,
            33,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "メテオアロー",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            61,
            0,
            102,
            51,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            74,
            0,
            123,
            62,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ゲイルシュート",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            97,
            50,
            105,
            25,
            0
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            145,
            75,
            157,
            38,
            0
          ],
          "tip": 1,
          "condition": "パワー40・器用さ50以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "セリアンラブシュート",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            61,
            51,
            114,
            0,
            52
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            91,
            75,
            170,
            0,
            79
          ],
          "tip": 1,
          "condition": "パワー40・器用さ50以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ポイズンアローズ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            69,
            0,
            118,
            28,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            83,
            0,
            142,
            33,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "秘弓・毒化粧",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            65,
            24,
            125,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            78,
            29,
            151,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "夢幻の水矢",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            55,
            93,
            105,
            25,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            82,
            138,
            157,
            38,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ガトリングスナイプ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            162,
            83,
            22,
            11
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            241,
            125,
            33,
            16
          ],
          "tip": 1,
          "condition": "パワー50・器用さ40以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ハイドロストライク",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            162,
            83,
            22,
            11
          ],
          "tip": 1,
          "condition": "パワー20・器用さ20以上",
          "scores": {
            "弓使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            241,
            125,
            33,
            16
          ],
          "tip": 1,
          "condition": "パワー50・器用さ40以上",
          "scores": {
            "弓使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "カウンタースタンス",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            41,
            110,
            0,
            64
          ],
          "tip": 1,
          "condition": "器用さ20以上・精神力20以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            49,
            132,
            0,
            78
          ],
          "tip": 1,
          "condition": "器用さ50以上・精神力40以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "アクアミドルスナイプ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            99,
            0,
            116
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "弓使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            119,
            0,
            140
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "弓使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "エアショット",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "弓使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            125,
            0,
            204,
            96,
            0
          ],
          "tip": 0,
          "condition": "器用さ20以上",
          "scores": {
            "弓使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ファイアエイム",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "弓使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            125,
            0,
            204,
            96,
            0
          ],
          "tip": 0,
          "condition": "器用さ20以上",
          "scores": {
            "弓使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "クラッシュアロー",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "弓使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            125,
            0,
            204,
            96,
            0
          ],
          "tip": 0,
          "condition": "器用さ20以上",
          "scores": {
            "弓使い": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "燃焼拳",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            57,
            147,
            221,
            0
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔闘士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "風流拳",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            57,
            147,
            221,
            0
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔闘士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ペネトレイトブロー",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            56,
            95,
            64,
            0
          ],
          "tip": 1,
          "condition": "魔力20・器用さ20以上",
          "scores": {
            "魔闘士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            67,
            114,
            78,
            0
          ],
          "tip": 1,
          "condition": "魔力50・器用さ40以上",
          "scores": {
            "魔闘士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "水脚乱舞",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            65,
            101,
            25
          ],
          "tip": 1,
          "condition": "魔力20・器用さ20以上",
          "scores": {
            "魔闘士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            129,
            97,
            151,
            38
          ],
          "tip": 1,
          "condition": "魔力50・器用さ40以上",
          "scores": {
            "魔闘士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "極上のおもてなし",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            90,
            45,
            91,
            52
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            133,
            66,
            137,
            79
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "受け流しの構え",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            108,
            108,
            0,
            0
          ],
          "tip": 1,
          "condition": "魔力20・耐久力20以上",
          "scores": {
            "魔闘士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            130,
            130,
            0,
            0
          ],
          "tip": 1,
          "condition": "魔力50・耐久力40以上",
          "scores": {
            "魔闘士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "水流崩撃",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            198,
            0,
            17,
            0,
            0
          ],
          "tip": 1,
          "condition": "魔力20・器用さ20以上",
          "scores": {
            "魔闘士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            238,
            0,
            21,
            0,
            0
          ],
          "tip": 1,
          "condition": "魔力50・器用さ40以上",
          "scores": {
            "魔闘士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔力活性",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            49,
            88,
            59
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 12,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            57,
            102,
            68
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 20,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔力開眼",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            20,
            61,
            114
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              585,
              585
            ],
            "僧侶": [
              643.5,
              643.5
            ],
            "魔闘士": [
              585,
              585
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 13,
            "HP回復倍率": 13,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            23,
            71,
            132
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              405,
              990
            ],
            "僧侶": [
              445.5,
              1089
            ],
            "魔闘士": [
              405,
              990
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 22,
            "HP回復倍率": 22,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "フルオート",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            22,
            123,
            51
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 12,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            25,
            143,
            59
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 20,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "精神統一",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            44,
            0,
            88,
            88
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              675,
              675
            ],
            "僧侶": [
              67.5,
              67.5
            ],
            "魔闘士": [
              675,
              675
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 15,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            56,
            0,
            113,
            113
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              450,
              1125
            ],
            "僧侶": [
              45,
              112.5
            ],
            "魔闘士": [
              450,
              1125
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 25,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "超気合",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            98,
            0,
            0,
            0,
            98
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "剣士": [
              520,
              520
            ],
            "弓使い": [
              520,
              520
            ],
            "重戦士": [
              520,
              520
            ],
            "魔法使い": [
              520,
              520
            ],
            "僧侶": [
              520,
              520
            ],
            "魔闘士": [
              520,
              520
            ],
            "双剣士": [
              520,
              520
            ]
          },
          "effect": {
            "弱体化状態異常耐性_下位意志除外": 26
          }
        },
        {
          "lv": 2,
          "cost": [
            113,
            0,
            0,
            0,
            113
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "剣士": [
              440,
              960
            ],
            "弓使い": [
              440,
              960
            ],
            "重戦士": [
              440,
              960
            ],
            "魔法使い": [
              440,
              960
            ],
            "僧侶": [
              440,
              960
            ],
            "魔闘士": [
              440,
              960
            ],
            "双剣士": [
              440,
              960
            ]
          },
          "effect": {
            "弱体化状態異常耐性_下位意志除外_累計": 48
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "lowerAbilities": ["意志"],
      "upper": null
    },
    {
      "name": "イーグルアイ",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            46,
            0,
            126,
            24,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              707,
              707
            ],
            "弓使い": [
              707,
              707
            ],
            "重戦士": [
              707,
              707
            ],
            "魔法使い": [
              707,
              707
            ],
            "僧侶": [
              707,
              707
            ],
            "魔闘士": [
              707,
              707
            ],
            "双剣士": [
              707,
              707
            ]
          },
          "effect": {
            "会心率": 7,
            "会心ダメージ倍率": 14
          }
        },
        {
          "lv": 2,
          "cost": [
            54,
            0,
            145,
            28,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              404,
              1111
            ],
            "弓使い": [
              404,
              1111
            ],
            "重戦士": [
              404,
              1111
            ],
            "魔法使い": [
              404,
              1111
            ],
            "僧侶": [
              404,
              1111
            ],
            "魔闘士": [
              404,
              1111
            ],
            "双剣士": [
              404,
              1111
            ]
          },
          "effect": {
            "会心率": 11,
            "会心ダメージ倍率": 22
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "研鑽",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            34,
            0,
            108,
            0,
            54
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              585,
              585
            ],
            "弓使い": [
              585,
              585
            ],
            "重戦士": [
              585,
              585
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              585,
              585
            ]
          },
          "effect": {
            "物理攻撃倍率": 13,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            39,
            0,
            125,
            0,
            62
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              405,
              990
            ],
            "弓使い": [
              405,
              990
            ],
            "重戦士": [
              405,
              990
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              405,
              990
            ]
          },
          "effect": {
            "物理攻撃倍率": 22,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "戦い抜く覚悟",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            99,
            77,
            0,
            20
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "剣士": [
              528,
              528
            ],
            "弓使い": [
              528,
              528
            ],
            "重戦士": [
              528,
              528
            ],
            "魔法使い": [
              528,
              528
            ],
            "僧侶": [
              528,
              528
            ],
            "魔闘士": [
              528,
              528
            ],
            "双剣士": [
              528,
              528
            ]
          },
          "effect": {
            "必殺技耐性": 16
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            114,
            89,
            0,
            23
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "剣士": [
              396,
              924
            ],
            "弓使い": [
              396,
              924
            ],
            "重戦士": [
              396,
              924
            ],
            "魔法使い": [
              396,
              924
            ],
            "僧侶": [
              396,
              924
            ],
            "魔闘士": [
              396,
              924
            ],
            "双剣士": [
              396,
              924
            ]
          },
          "effect": {
            "必殺技耐性": 28
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "強運の覇者",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            49,
            82,
            0,
            65
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              650,
              650
            ],
            "弓使い": [
              650,
              650
            ],
            "重戦士": [
              650,
              650
            ],
            "魔法使い": [
              650,
              650
            ],
            "僧侶": [
              650,
              650
            ],
            "魔闘士": [
              650,
              650
            ],
            "双剣士": [
              650,
              650
            ]
          },
          "effect": {
            "会心率": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            57,
            94,
            0,
            75
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              520,
              1170
            ],
            "弓使い": [
              520,
              1170
            ],
            "重戦士": [
              520,
              1170
            ],
            "魔法使い": [
              520,
              1170
            ],
            "僧侶": [
              520,
              1170
            ],
            "魔闘士": [
              520,
              1170
            ],
            "双剣士": [
              520,
              1170
            ]
          },
          "effect": {
            "会心率": 18
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "オーバードライブ",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            11,
            59,
            114,
            11,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              484,
              484
            ],
            "弓使い": [
              484,
              484
            ],
            "重戦士": [
              484,
              484
            ],
            "魔法使い": [
              484,
              484
            ],
            "僧侶": [
              484,
              484
            ],
            "魔闘士": [
              484,
              484
            ],
            "双剣士": [
              484,
              484
            ]
          },
          "effect": {
            "必殺技倍率": 22
          }
        },
        {
          "lv": 2,
          "cost": [
            13,
            68,
            132,
            13,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              440,
              924
            ],
            "弓使い": [
              440,
              924
            ],
            "重戦士": [
              440,
              924
            ],
            "魔法使い": [
              440,
              924
            ],
            "僧侶": [
              440,
              924
            ],
            "魔闘士": [
              440,
              924
            ],
            "双剣士": [
              440,
              924
            ]
          },
          "effect": {
            "必殺技倍率": 42
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "剛力",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            73,
            0,
            0,
            0,
            123
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            85,
            0,
            0,
            0,
            142
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "加護",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            104,
            0,
            46,
            46
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              500,
              500
            ],
            "弓使い": [
              500,
              500
            ],
            "重戦士": [
              500,
              500
            ],
            "魔法使い": [
              500,
              500
            ],
            "僧侶": [
              500,
              500
            ],
            "魔闘士": [
              500,
              500
            ],
            "双剣士": [
              500,
              500
            ]
          },
          "effect": {
            "全体攻撃耐性": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            120,
            0,
            53,
            53
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              400,
              900
            ],
            "弓使い": [
              400,
              900
            ],
            "重戦士": [
              400,
              900
            ],
            "魔法使い": [
              400,
              900
            ],
            "僧侶": [
              400,
              900
            ],
            "魔闘士": [
              400,
              900
            ],
            "双剣士": [
              400,
              900
            ]
          },
          "effect": {
            "全体攻撃耐性": 18
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "タフネス",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            75,
            0,
            0,
            0,
            55
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率_下位忍耐除外": 7
          }
        },
        {
          "lv": 2,
          "cost": [
            112,
            0,
            0,
            0,
            82
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率_下位忍耐除外_累計": 17
          }
        }
      ],
      "hp": true,
      "resistance": false,
      "lowerAbilities": ["忍耐"],
      "upper": null
    },
    {
      "name": "そよかぜの加護",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            33,
            74,
            89
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率": 11
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            38,
            85,
            103
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率": 22
          }
        }
      ],
      "hp": true,
      "resistance": false,
      "upper": null
    },
    {
      "name": "大真面目",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            134,
            0,
            0,
            0,
            62
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "物理攻撃倍率": 6,
            "HP倍率": 6
          }
        },
        {
          "lv": 2,
          "cost": [
            155,
            0,
            0,
            0,
            71
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "剣士": [
              null,
              null
            ],
            "弓使い": [
              null,
              null
            ],
            "重戦士": [
              null,
              null
            ],
            "魔法使い": [
              null,
              null
            ],
            "僧侶": [
              null,
              null
            ],
            "魔闘士": [
              null,
              null
            ],
            "双剣士": [
              null,
              null
            ]
          },
          "effect": {
            "物理攻撃倍率": 10,
            "HP倍率": 10
          }
        }
      ],
      "hp": true,
      "resistance": false,
      "upper": null
    },
    {
      "name": "鉄壁の盾",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "重戦士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            37,
            0,
            73
          ],
          "tip": 1,
          "condition": "生命力50以上",
          "scores": {
            "重戦士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率": 10,
            "HP増加率_累計": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            94,
            47,
            0,
            85
          ],
          "tip": 1,
          "condition": "生命力60以上",
          "scores": {
            "重戦士": [
              null,
              null
            ]
          },
          "effect": {
            "HP依存査定率": 20,
            "HP増加率_累計": 20
          }
        }
      ],
      "hp": true,
      "resistance": false,
      "upper": null,
      "jobFamily": "重戦士系統"
    },
    {
      "name": "慈愛の祈り",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            73,
            0,
            0,
            123
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              700,
              700
            ],
            "弓使い": [
              700,
              700
            ],
            "重戦士": [
              700,
              700
            ],
            "魔法使い": [
              700,
              700
            ],
            "僧侶": [
              700,
              700
            ],
            "魔闘士": [
              700,
              700
            ],
            "双剣士": [
              700,
              700
            ]
          },
          "effect": {
            "物理攻撃耐性": 5,
            "魔法攻撃耐性": 5
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            85,
            0,
            0,
            142
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              280,
              980
            ],
            "弓使い": [
              280,
              980
            ],
            "重戦士": [
              280,
              980
            ],
            "魔法使い": [
              280,
              980
            ],
            "僧侶": [
              280,
              980
            ],
            "魔闘士": [
              280,
              980
            ],
            "双剣士": [
              280,
              980
            ]
          },
          "effect": {
            "物理攻撃耐性": 7,
            "魔法攻撃耐性": 7
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "不滅",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            34,
            0,
            75,
            86
          ],
          "tip": 1,
          "condition": "精神力50以上",
          "scores": {
            "剣士": [
              565,
              565
            ],
            "弓使い": [
              565,
              565
            ],
            "重戦士": [
              565,
              565
            ],
            "魔法使い": [
              565,
              565
            ],
            "僧侶": [
              686.5,
              686.5
            ],
            "魔闘士": [
              565,
              565
            ],
            "双剣士": [
              565,
              565
            ]
          },
          "effect": {
            "魔法攻撃耐性": 10,
            "物理攻撃倍率": -3,
            "魔法攻撃倍率": -3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            40,
            0,
            87,
            100
          ],
          "tip": 1,
          "condition": "精神力60以上",
          "scores": {
            "剣士": [
              310,
              875
            ],
            "弓使い": [
              310,
              875
            ],
            "重戦士": [
              310,
              875
            ],
            "魔法使い": [
              310,
              875
            ],
            "僧侶": [
              472,
              1158.5
            ],
            "魔闘士": [
              310,
              875
            ],
            "双剣士": [
              310,
              875
            ]
          },
          "effect": {
            "魔法攻撃耐性": 17,
            "物理攻撃倍率": -7,
            "魔法攻撃倍率": -7
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "無頼漢の教え",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            73,
            86,
            37,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力50以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "物理攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            85,
            94,
            47,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "物理攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "不朽の意志",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            73,
            123,
            0
          ],
          "tip": 1,
          "condition": "生命力40・耐久力40以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "通常攻撃耐性": 28
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            85,
            142,
            0
          ],
          "tip": 1,
          "condition": "生命力50・耐久力50以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "通常攻撃耐性": 49
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "魔力耐性",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            39,
            0,
            98,
            59
          ],
          "tip": 1,
          "condition": "精神力50以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "魔法攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            45,
            0,
            113,
            68
          ],
          "tip": 1,
          "condition": "精神力60以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "魔法攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "ウィンドプロテクション",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            95,
            33,
            0,
            69
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "風攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            109,
            38,
            0,
            79
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "風攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "ウォータープロテクション",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            95,
            33,
            0,
            69
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "水攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            109,
            38,
            0,
            79
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "水攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "ファイアプロテクション",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            95,
            33,
            0,
            69
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "火攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            109,
            38,
            0,
            79
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "火攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "カチカチボディ",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            37,
            98,
            0,
            0,
            61
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              420,
              420
            ],
            "弓使い": [
              420,
              420
            ],
            "重戦士": [
              420,
              420
            ],
            "魔法使い": [
              420,
              420
            ],
            "僧侶": [
              420,
              420
            ],
            "魔闘士": [
              420,
              420
            ],
            "双剣士": [
              420,
              420
            ]
          },
          "effect": {
            "被ダメージ耐性": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            42,
            113,
            0,
            0,
            71
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              280,
              700
            ],
            "弓使い": [
              280,
              700
            ],
            "重戦士": [
              280,
              700
            ],
            "魔法使い": [
              280,
              700
            ],
            "僧侶": [
              280,
              700
            ],
            "魔闘士": [
              280,
              700
            ],
            "双剣士": [
              280,
              700
            ]
          },
          "effect": {
            "被ダメージ耐性": 5
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "百戦の生存術",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            89,
            77,
            0,
            0,
            30
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              700,
              700
            ],
            "弓使い": [
              700,
              700
            ],
            "重戦士": [
              700,
              700
            ],
            "魔法使い": [
              700,
              700
            ],
            "僧侶": [
              700,
              700
            ],
            "魔闘士": [
              700,
              700
            ],
            "双剣士": [
              700,
              700
            ]
          },
          "effect": {
            "単体攻撃耐性": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            103,
            89,
            0,
            0,
            35
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              560,
              1260
            ],
            "弓使い": [
              560,
              1260
            ],
            "重戦士": [
              560,
              1260
            ],
            "魔法使い": [
              560,
              1260
            ],
            "僧侶": [
              560,
              1260
            ],
            "魔闘士": [
              560,
              1260
            ],
            "双剣士": [
              560,
              1260
            ]
          },
          "effect": {
            "単体攻撃耐性": 18
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "超免疫",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            19,
            41,
            70
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              520,
              520
            ],
            "弓使い": [
              520,
              520
            ],
            "重戦士": [
              520,
              520
            ],
            "魔法使い": [
              520,
              520
            ],
            "僧侶": [
              520,
              520
            ],
            "魔闘士": [
              520,
              520
            ],
            "双剣士": [
              520,
              520
            ]
          },
          "effect": {
            "ダメージ状態異常耐性_下位除外": 26
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            28,
            61,
            105
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              440,
              960
            ],
            "弓使い": [
              440,
              960
            ],
            "重戦士": [
              440,
              960
            ],
            "魔法使い": [
              440,
              960
            ],
            "僧侶": [
              440,
              960
            ],
            "魔闘士": [
              440,
              960
            ],
            "双剣士": [
              440,
              960
            ]
          },
          "effect": {
            "ダメージ状態異常耐性_下位除外_累計": 48
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "lowerAbilities": ["免疫強化"],
      "upper": null
    },
    {
      "name": "救援者",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            59,
            68,
            0,
            68,
            0
          ],
          "tip": 1,
          "condition": "生命力20・耐久力20・精神力20以上",
          "scores": {
            "剣士": [
              560,
              560
            ],
            "弓使い": [
              560,
              560
            ],
            "重戦士": [
              560,
              560
            ],
            "魔法使い": [
              560,
              560
            ],
            "僧侶": [
              560,
              560
            ],
            "魔闘士": [
              560,
              560
            ],
            "双剣士": [
              560,
              560
            ]
          },
          "effect": {
            "物理攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            68,
            79,
            0,
            79,
            0
          ],
          "tip": 1,
          "condition": "生命力30・耐久力30・精神力30以上",
          "scores": {
            "剣士": [
              420,
              980
            ],
            "弓使い": [
              420,
              980
            ],
            "重戦士": [
              420,
              980
            ],
            "魔法使い": [
              420,
              980
            ],
            "僧侶": [
              420,
              980
            ],
            "魔闘士": [
              420,
              980
            ],
            "双剣士": [
              420,
              980
            ]
          },
          "effect": {
            "物理攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "対魔の盾",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "重戦士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            37,
            73,
            0
          ],
          "tip": 1,
          "condition": "精神力50以上",
          "scores": {
            "重戦士": [
              560,
              560
            ]
          },
          "effect": {
            "魔法攻撃耐性": 8
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            94,
            47,
            85,
            0
          ],
          "tip": 1,
          "condition": "精神力60以上",
          "scores": {
            "重戦士": [
              420,
              980
            ]
          },
          "effect": {
            "魔法攻撃耐性": 14
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null,
      "jobFamily": "重戦士系統"
    },
    {
      "name": "不屈の精神",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "僧侶"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            65,
            33,
            0,
            98
          ],
          "tip": 1,
          "condition": "耐久力40以上・精神力40以上",
          "scores": {
            "僧侶": [
              560,
              560
            ]
          },
          "effect": {
            "物理攻撃耐性": 4,
            "魔法攻撃耐性": 4
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            73,
            40,
            0,
            113
          ],
          "tip": 1,
          "condition": "耐久力50以上・精神力50以上",
          "scores": {
            "僧侶": [
              420,
              980
            ]
          },
          "effect": {
            "物理攻撃耐性": 7,
            "魔法攻撃耐性": 7
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null,
      "jobFamily": "僧侶系統"
    },
    {
      "name": "鉄人",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            95,
            0,
            0,
            0,
            35
          ],
          "tip": 1,
          "condition": "生命力40以上・精神力40以上",
          "scores": {
            "剣士": [
              420,
              420
            ],
            "弓使い": [
              420,
              420
            ],
            "重戦士": [
              420,
              420
            ],
            "魔法使い": [
              420,
              420
            ],
            "僧侶": [
              420,
              420
            ],
            "魔闘士": [
              420,
              420
            ],
            "双剣士": [
              420,
              420
            ]
          },
          "effect": {
            "物理攻撃耐性": 5,
            "魔法攻撃耐性": 5
          }
        },
        {
          "lv": 2,
          "cost": [
            142,
            0,
            0,
            0,
            52
          ],
          "tip": 1,
          "condition": "生命力50以上・精神力50以上",
          "scores": {
            "剣士": [
              280,
              700
            ],
            "弓使い": [
              280,
              700
            ],
            "重戦士": [
              280,
              700
            ],
            "魔法使い": [
              280,
              700
            ],
            "僧侶": [
              280,
              700
            ],
            "魔闘士": [
              280,
              700
            ],
            "双剣士": [
              280,
              700
            ]
          },
          "effect": {
            "物理攻撃耐性": 7,
            "魔法攻撃耐性": 7
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "lowerAbilities": ["ケガしにくさ◎"],
      "upper": "ケガしにくさ◎"
    },
    {
      "name": "火事場の馬鹿力",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            141,
            0,
            0,
            21,
            33
          ],
          "tip": 1,
          "condition": "精神力50以上",
          "scores": {
            "剣士": [
              530,
              530
            ],
            "弓使い": [
              530,
              530
            ],
            "重戦士": [
              530,
              530
            ],
            "魔法使い": [
              530,
              530
            ],
            "僧侶": [
              530,
              530
            ],
            "魔闘士": [
              530,
              530
            ],
            "双剣士": [
              530,
              530
            ]
          },
          "effect": {
            "与ダメージ倍率": 18,
            "被ダメージ耐性": -2
          }
        },
        {
          "lv": 2,
          "cost": [
            163,
            0,
            0,
            25,
            38
          ],
          "tip": 1,
          "condition": "精神力60以上",
          "scores": {
            "剣士": [
              350,
              880
            ],
            "弓使い": [
              350,
              880
            ],
            "重戦士": [
              350,
              880
            ],
            "魔法使い": [
              350,
              880
            ],
            "僧侶": [
              350,
              880
            ],
            "魔闘士": [
              350,
              880
            ],
            "双剣士": [
              350,
              880
            ]
          },
          "effect": {
            "与ダメージ倍率": 32,
            "被ダメージ耐性": -4
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "安全運転",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            45,
            0,
            0,
            151
          ],
          "tip": 1,
          "condition": "耐久力40・精神力40以上",
          "scores": {
            "剣士": [
              700,
              700
            ],
            "弓使い": [
              700,
              700
            ],
            "重戦士": [
              700,
              700
            ],
            "魔法使い": [
              700,
              700
            ],
            "僧侶": [
              700,
              700
            ],
            "魔闘士": [
              700,
              700
            ],
            "双剣士": [
              700,
              700
            ]
          },
          "effect": {
            "物理攻撃耐性": 5,
            "魔法攻撃耐性": 5
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            52,
            0,
            0,
            174
          ],
          "tip": 1,
          "condition": "耐久力50・精神力50以上",
          "scores": {
            "剣士": [
              280,
              980
            ],
            "弓使い": [
              280,
              980
            ],
            "重戦士": [
              280,
              980
            ],
            "魔法使い": [
              280,
              980
            ],
            "僧侶": [
              280,
              980
            ],
            "魔闘士": [
              280,
              980
            ],
            "双剣士": [
              280,
              980
            ]
          },
          "effect": {
            "物理攻撃耐性": 7,
            "魔法攻撃耐性": 7
          }
        }
      ],
      "hp": false,
      "resistance": true,
      "upper": null
    },
    {
      "name": "平常心",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            16,
            40,
            0,
            74
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              260,
              260
            ],
            "弓使い": [
              260,
              260
            ],
            "重戦士": [
              260,
              260
            ],
            "魔法使い": [
              260,
              260
            ],
            "僧侶": [
              520,
              520
            ],
            "魔闘士": [
              260,
              260
            ],
            "双剣士": [
              260,
              260
            ]
          },
          "effect": {
            "通常攻撃倍率": 40,
            "通常攻撃HP回復倍率": 20
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            24,
            60,
            0,
            111
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              390,
              650
            ],
            "弓使い": [
              390,
              650
            ],
            "重戦士": [
              390,
              650
            ],
            "魔法使い": [
              390,
              650
            ],
            "僧侶": [
              585,
              1105
            ],
            "魔闘士": [
              390,
              650
            ],
            "双剣士": [
              390,
              650
            ]
          },
          "effect": {
            "通常攻撃倍率": 70,
            "通常攻撃HP回復倍率": 35
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["通常攻撃◎"],
      "upper": null
    },
    {
      "name": "トリックスター",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            26,
            104,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              300,
              300
            ],
            "弓使い": [
              300,
              300
            ],
            "重戦士": [
              300,
              300
            ],
            "魔法使い": [
              300,
              300
            ],
            "僧侶": [
              516,
              300
            ],
            "魔闘士": [
              300,
              300
            ],
            "双剣士": [
              300,
              300
            ]
          },
          "effect": {
            "アクションスキル倍率_画面表示": 45,
            "アクションHP回復倍率_画面表示": 22,
            "アクションスキル倍率_下位除外": 25,
            "アクションHP回復倍率_下位除外": 18
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            39,
            156,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              420,
              720
            ],
            "弓使い": [
              420,
              720
            ],
            "重戦士": [
              420,
              720
            ],
            "魔法使い": [
              420,
              720
            ],
            "僧侶": [
              636,
              1152
            ],
            "魔闘士": [
              420,
              720
            ],
            "双剣士": [
              420,
              720
            ]
          },
          "effect": {
            "アクションスキル倍率_画面表示_累計": 80,
            "アクションHP回復倍率_画面表示_累計": 40,
            "アクションスキル倍率_下位除外_累計": 60,
            "アクションHP回復倍率_下位除外_累計": 36
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["アクションスキル◎"],
      "upper": null
    },
    {
      "name": "一点集中",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            21,
            49,
            0,
            60
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              315,
              315
            ],
            "弓使い": [
              315,
              315
            ],
            "重戦士": [
              315,
              315
            ],
            "魔法使い": [
              315,
              315
            ],
            "僧侶": [
              585,
              315
            ],
            "魔闘士": [
              315,
              315
            ],
            "双剣士": [
              315,
              315
            ]
          },
          "effect": {
            "単体攻撃_下位除外": 7,
            "単体HP回復": 6,
            "単体攻撃倍率_画面表示_累計": 12,
            "単体HP回復倍率_画面表示_累計": 6,
            "単体攻撃_下位除外_累計": 7,
            "下位単体攻撃◎倍率": 5
          },
          "tips": {
            "1": [
              0,
              21,
              49,
              0,
              60
            ],
            "2": [
              0,
              16,
              39,
              0,
              48
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            31,
            73,
            0,
            90
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              675
            ],
            "弓使い": [
              360,
              675
            ],
            "重戦士": [
              360,
              675
            ],
            "魔法使い": [
              360,
              675
            ],
            "僧侶": [
              540,
              1125
            ],
            "魔闘士": [
              360,
              675
            ],
            "双剣士": [
              360,
              675
            ]
          },
          "effect": {
            "単体攻撃_下位除外_累計": 15,
            "単体HP回復": 10,
            "単体攻撃倍率_画面表示_累計": 20,
            "単体HP回復倍率_画面表示_累計": 10,
            "下位単体攻撃◎倍率": 5
          },
          "tips": {
            "1": [
              0,
              31,
              73,
              0,
              90
            ],
            "2": [
              0,
              25,
              58,
              0,
              72
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["単体攻撃◎"],
      "upper": null
    },
    {
      "name": "烈",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            57,
            52,
            20,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              363,
              363
            ],
            "弓使い": [
              363,
              363
            ],
            "重戦士": [
              363,
              363
            ],
            "魔法使い": [
              363,
              363
            ],
            "僧侶": [
              363,
              363
            ],
            "魔闘士": [
              363,
              363
            ],
            "双剣士": [
              363,
              363
            ]
          },
          "effect": {
            "列攻撃倍率_画面表示": 16,
            "列攻撃倍率_下位除外": 11
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            86,
            78,
            30,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              396,
              759
            ],
            "弓使い": [
              396,
              759
            ],
            "重戦士": [
              396,
              759
            ],
            "魔法使い": [
              396,
              759
            ],
            "僧侶": [
              396,
              759
            ],
            "魔闘士": [
              396,
              759
            ],
            "双剣士": [
              396,
              759
            ]
          },
          "effect": {
            "列攻撃倍率_画面表示_累計": 28,
            "列攻撃倍率_下位除外_累計": 23,
            "列攻撃倍率_本Lv増分": 12
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["列攻撃◎"],
      "upper": null
    },
    {
      "name": "サイクロプスキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            44,
            61,
            0,
            25,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "サイクロプス特効_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            66,
            91,
            0,
            37,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "サイクロプス特効_下位除外_累計": 17
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対サイクロプス◎"],
      "upper": null
    },
    {
      "name": "フィッシュキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            106,
            24,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "フィッシュ特効_画面表示": 12
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            159,
            36,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "フィッシュ特効_画面表示": 20
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対フィッシュ◎"],
      "upper": null
    },
    {
      "name": "妖狐キラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            54,
            76,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "特効倍率_画面表示": 12,
            "特効倍率_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            81,
            114,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "特効倍率_画面表示_累計": 20,
            "特効倍率_下位除外_累計": 17,
            "特効倍率_本Lv増分": 8
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対妖狐◎"],
      "upper": null
    },
    {
      "name": "スケルトンキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            50,
            10,
            0,
            0,
            70
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "特効倍率_画面表示": 12,
            "特効倍率_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            75,
            15,
            0,
            0,
            105
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "特効倍率_画面表示_累計": 20,
            "特効倍率_下位除外_累計": 17,
            "特効倍率_本Lv増分": 8
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対スケルトン◎"],
      "upper": null
    },
    {
      "name": "ヌメリンキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            24,
            12,
            94,
            0
          ],
          "tip": 1,
          "condition": "魔力40以上、器用さ40以上",
          "scores": {
            "剣士": [
              40.5,
              40.5
            ],
            "弓使い": [
              40.5,
              40.5
            ],
            "重戦士": [
              40.5,
              40.5
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              40.5,
              40.5
            ]
          },
          "effect": {
            "ヌメリン特効倍率_画面表示": 12,
            "ヌメリン特効倍率_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            36,
            18,
            141,
            0
          ],
          "tip": 1,
          "condition": "魔力50以上、器用さ50以上",
          "scores": {
            "剣士": [
              36,
              76.5
            ],
            "弓使い": [
              36,
              76.5
            ],
            "重戦士": [
              36,
              76.5
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              36,
              76.5
            ]
          },
          "effect": {
            "ヌメリン特効倍率_画面表示_累計": 20,
            "ヌメリン特効倍率_下位除外_累計": 17,
            "ヌメリン特効倍率_本Lv増分": 8
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対ヌメリン◎"],
      "upper": null
    },
    {
      "name": "ゴブリンキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            50,
            0,
            40,
            40,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "特効倍率_画面表示": 12,
            "特効倍率_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            75,
            0,
            60,
            60,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "特効倍率_画面表示_累計": 20,
            "特効倍率_下位除外_累計": 17,
            "特効倍率_本Lv増分": 8
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対ゴブリン◎"],
      "upper": null
    },
    {
      "name": "植物キラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            39,
            39,
            52,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              405,
              405
            ],
            "弓使い": [
              405,
              405
            ],
            "重戦士": [
              405,
              405
            ],
            "魔法使い": [
              405,
              405
            ],
            "僧侶": [
              405,
              405
            ],
            "魔闘士": [
              405,
              405
            ],
            "双剣士": [
              405,
              405
            ]
          },
          "effect": {
            "特効倍率_画面表示": 12,
            "特効倍率_下位除外": 9
          }
        },
        {
          "lv": 2,
          "cost": [
            58,
            58,
            79,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              765
            ],
            "弓使い": [
              360,
              765
            ],
            "重戦士": [
              360,
              765
            ],
            "魔法使い": [
              360,
              765
            ],
            "僧侶": [
              360,
              765
            ],
            "魔闘士": [
              360,
              765
            ],
            "双剣士": [
              360,
              765
            ]
          },
          "effect": {
            "特効倍率_画面表示_累計": 20,
            "特効倍率_下位除外_累計": 17,
            "特効倍率_本Lv増分": 8
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "lowerAbilities": ["対植物◎"],
      "upper": null
    },
    {
      "name": "怪力",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            175,
            0,
            0,
            0,
            21
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            203,
            0,
            0,
            0,
            24
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "初志貫徹",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            138,
            47,
            11,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            159,
            54,
            12,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ドラゴンアースキラー",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            149,
            0,
            0,
            0,
            47
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              540,
              540
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "ドラゴンアース特効": 12
          }
        },
        {
          "lv": 2,
          "cost": [
            172,
            0,
            0,
            0,
            54
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              360,
              900
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "ドラゴンアース特効": 20
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ラインブースト",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "魔法使い"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            59,
            0,
            19,
            118,
            0
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "魔法使い": [
              330,
              330
            ]
          },
          "effect": {
            "列攻撃倍率": 10
          }
        },
        {
          "lv": 2,
          "cost": [
            68,
            0,
            22,
            136,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "魔法使い": [
              264,
              594
            ]
          },
          "effect": {
            "列攻撃倍率": 18
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null,
      "jobFamily": "魔法使い系統"
    },
    {
      "name": "癒しの恩寵",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "僧侶"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            73,
            37,
            86
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "僧侶": [
              540,
              540
            ]
          },
          "effect": {
            "HP回復倍率": 12
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            85,
            47,
            94
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              360,
              900
            ]
          },
          "effect": {
            "HP回復倍率": 20
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null,
      "jobFamily": "僧侶系統"
    },
    {
      "name": "渦巻く剣刃",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            63,
            25,
            105,
            0,
            84
          ],
          "tip": 1,
          "condition": "パワー20・耐久力20以上",
          "scores": {
            "剣士": [
              1600,
              1600
            ],
            "双剣士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            94,
            38,
            157,
            0,
            126
          ],
          "tip": 1,
          "condition": "パワー50・耐久力50以上",
          "scores": {
            "剣士": [
              1200,
              2800
            ],
            "双剣士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ソードオブロンド",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            47,
            176,
            36,
            0,
            19
          ],
          "tip": 1,
          "condition": "生命力20・パワー20以上",
          "scores": {
            "剣士": [
              1600,
              1600
            ],
            "双剣士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            70,
            262,
            54,
            0,
            29
          ],
          "tip": 1,
          "condition": "生命力50・パワー50以上",
          "scores": {
            "剣士": [
              1200,
              2800
            ],
            "双剣士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "守りの鼓舞",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            127,
            25,
            0,
            127
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            189,
            38,
            0,
            189
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "パニッシュオーラ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            166,
            132,
            25,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            250,
            198,
            38,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "豪雷積層雲",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            76,
            216,
            31
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            114,
            324,
            47
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マリンスフィア",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            25,
            48,
            137,
            67
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            38,
            72,
            204,
            100
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "トキシックブリーズ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            27,
            57,
            127,
            67
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            41,
            85,
            189,
            100
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "クレッセントフォール",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            28,
            83,
            111,
            56
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            41,
            124,
            166,
            83
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "根性注入",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            111,
            0,
            0,
            56,
            111
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            166,
            0,
            0,
            83,
            166
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "僧侶": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "聖炎の祝福",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            57,
            95,
            127
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            85,
            141,
            189
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "僧侶": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ライフオーブ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            57,
            0,
            127,
            95
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            85,
            0,
            189,
            141
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "エクスヒーリング",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            44,
            155,
            124
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            67,
            233,
            186
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "疾風の波動",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            57,
            27,
            127,
            67
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            85,
            41,
            189,
            100
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "パワーシュート",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "弓使い"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            67,
            89,
            111,
            0,
            0
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "弓使い": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マジックアッパー",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "魔闘士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            22,
            89,
            155,
            0
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "魔闘士": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "爆熱フィスト",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            55,
            112,
            25
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            129,
            82,
            167,
            38
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ヒートラッシュ",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            29,
            118,
            117,
            59
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            44,
            177,
            177,
            88
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "インサイトブロー",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            86,
            55,
            112,
            25
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            129,
            82,
            167,
            38
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "凶壊無間獄",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            30,
            77,
            117,
            99
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1860,
              1860
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            46,
            116,
            175,
            149
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              1390,
              3250
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "守護水斬",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            26,
            118,
            71,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー20以上・耐久力20以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            31,
            142,
            85,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー50以上・耐久力40以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "流水払い",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "剣士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            90,
            125,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー20以上・器用さ20以上",
          "scores": {
            "剣士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            109,
            150,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー50以上・器用さ40以上",
          "scores": {
            "剣士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "清流の加護",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            47,
            57,
            111
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            56,
            69,
            133
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ヒールシャワー",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            60,
            129,
            26
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            72,
            155,
            31
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ホーリーライト",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            26,
            0,
            103,
            86
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            31,
            0,
            124,
            104
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "パンプアップチアー",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            61,
            82,
            72
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            74,
            99,
            86
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "リフレッシュエアー",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            60,
            0,
            26,
            129,
            0
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            72,
            0,
            31,
            155,
            0
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ウィンドヒール",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "僧侶"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            23,
            193,
            210
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "僧侶": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "炎の盾",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "重戦士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            71,
            184,
            0,
            0,
            170
          ],
          "tip": 0,
          "condition": "耐久力20以上",
          "scores": {
            "重戦士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "風の盾",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            71,
            184,
            0,
            0,
            170
          ],
          "tip": 0,
          "condition": "耐久力20以上",
          "scores": {
            "重戦士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "シールドブレード",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            71,
            184,
            0,
            0,
            170
          ],
          "tip": 0,
          "condition": "耐久力20以上",
          "scores": {
            "重戦士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "アクアグランド",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            60,
            129,
            26,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            72,
            155,
            31,
            0,
            0
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "強靭の威光",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            47,
            114,
            54,
            0
          ],
          "tip": 1,
          "condition": "耐久力20以上・精神力20以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            57,
            137,
            65,
            0
          ],
          "tip": 1,
          "condition": "耐久力50以上・精神力40以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "フロストクラッシュ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            60,
            95,
            0,
            0,
            60
          ],
          "tip": 1,
          "condition": "耐久力40以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            72,
            114,
            0,
            0,
            72
          ],
          "tip": 1,
          "condition": "耐久力60以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ソーサリーエリア",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            0,
            108,
            108
          ],
          "tip": 1,
          "condition": "魔力20以上・精神力20以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            0,
            130,
            130
          ],
          "tip": 1,
          "condition": "魔力50以上・精神力40以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ファストブレイズ",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔法使い"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            64,
            118,
            32
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔法使い": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            77,
            143,
            39
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔法使い": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "炎魔連撃",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            19,
            151,
            45
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "魔闘士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            23,
            181,
            54
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "魔闘士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "火脚連撃",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            87,
            62,
            0,
            99
          ],
          "tip": 1,
          "condition": "精神力40以上",
          "scores": {
            "魔闘士": [
              1297,
              1297
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            104,
            74,
            0,
            119
          ],
          "tip": 1,
          "condition": "精神力60以上",
          "scores": {
            "魔闘士": [
              773,
              2070
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "水流拳",
      "category": "アクションスキル",
      "kind": "汎用",
      "jobs": [
        "魔闘士"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            47,
            123,
            184,
            0
          ],
          "tip": 0,
          "condition": "魔力20以上",
          "scores": {
            "魔闘士": [
              600,
              600
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "ライジングストライク",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "剣士",
        "双剣士"
      ],
      "attribute": "火",
      "levels": [
        {
          "lv": 1,
          "cost": [
            127,
            25,
            76,
            0,
            50
          ],
          "tip": 1,
          "condition": "パワー40以上",
          "scores": {
            "剣士": [
              1600,
              1600
            ],
            "双剣士": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            189,
            38,
            113,
            0,
            75
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              1200,
              2800
            ],
            "双剣士": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "旋風双撃",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "双剣士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            39,
            91,
            138,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ40以上",
          "scores": {
            "双剣士": [
              1500,
              1500
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            50,
            118,
            177,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "双剣士": [
              900,
              2400
            ]
          }
        },
        {
          "lv": 3,
          "cost": [
            174,
            408,
            612,
            0,
            0
          ],
          "tip": 1,
          "condition": "器用さ80以上",
          "scores": {
            "双剣士": [
              900,
              3300
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "生命の雫",
      "category": "必殺技",
      "kind": "固有",
      "jobs": [
        "僧侶"
      ],
      "attribute": "水",
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            57,
            111,
            111
          ],
          "tip": 1,
          "condition": "魔力40以上",
          "scores": {
            "僧侶": [
              1600,
              1600
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            137,
            137,
            141
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "僧侶": [
              1200,
              2800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "マジックバレット",
      "category": "必殺技",
      "kind": "汎用",
      "jobs": [
        "魔法使い"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            67,
            111,
            89
          ],
          "tip": 0,
          "condition": "条件なし",
          "scores": {
            "魔法使い": [
              900,
              900
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "烈風の舞",
      "category": "アクションスキル",
      "kind": "固有",
      "jobs": [
        "重戦士"
      ],
      "attribute": "風",
      "levels": [
        {
          "lv": 1,
          "cost": [
            21,
            0,
            0,
            129,
            65
          ],
          "tip": 1,
          "condition": "魔力20以上・精神力20以上",
          "scores": {
            "重戦士": [
              1125,
              1125
            ]
          }
        },
        {
          "lv": 2,
          "cost": [
            26,
            0,
            0,
            155,
            78
          ],
          "tip": 1,
          "condition": "魔力50以上・精神力40以上",
          "scores": {
            "重戦士": [
              675,
              1800
            ]
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "必殺の秘技",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            90,
            73,
            32
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              484,
              484
            ],
            "弓使い": [
              484,
              484
            ],
            "重戦士": [
              484,
              484
            ],
            "魔法使い": [
              484,
              484
            ],
            "僧侶": [
              726,
              726
            ],
            "魔闘士": [
              484,
              484
            ],
            "双剣士": [
              484,
              484
            ]
          },
          "effect": {
            "必殺技倍率": 22,
            "必殺技HP回復倍率": 11
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            104,
            85,
            38
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              440,
              924
            ],
            "弓使い": [
              440,
              924
            ],
            "重戦士": [
              440,
              924
            ],
            "魔法使い": [
              440,
              924
            ],
            "僧侶": [
              660,
              1386
            ],
            "魔闘士": [
              440,
              924
            ],
            "双剣士": [
              440,
              924
            ]
          },
          "effect": {
            "必殺技倍率": 42,
            "必殺技HP回復倍率": 21
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "必殺の書",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            71,
            46,
            0,
            0,
            78
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              484,
              484
            ],
            "弓使い": [
              484,
              484
            ],
            "重戦士": [
              484,
              484
            ],
            "魔法使い": [
              484,
              484
            ],
            "僧侶": [
              726,
              726
            ],
            "魔闘士": [
              484,
              484
            ],
            "双剣士": [
              484,
              484
            ]
          },
          "effect": {
            "必殺技倍率": 22,
            "必殺技HP回復倍率": 11
          }
        },
        {
          "lv": 2,
          "cost": [
            83,
            53,
            0,
            0,
            91
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              440,
              924
            ],
            "弓使い": [
              440,
              924
            ],
            "重戦士": [
              440,
              924
            ],
            "魔法使い": [
              440,
              924
            ],
            "僧侶": [
              660,
              1386
            ],
            "魔闘士": [
              440,
              924
            ],
            "双剣士": [
              440,
              924
            ]
          },
          "effect": {
            "必殺技倍率": 42,
            "必殺技HP回復倍率": 21
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "エースアタッカー",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            73,
            0,
            123
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            85,
            0,
            142
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔族キラー",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            34,
            0,
            0,
            63,
            98
          ],
          "tip": 1,
          "condition": "器用さ50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              540,
              540
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "魔族特効": 12
          }
        },
        {
          "lv": 2,
          "cost": [
            40,
            0,
            0,
            73,
            113
          ],
          "tip": 1,
          "condition": "器用さ60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              360,
              900
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "魔族特効": 20
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "フルスロットル",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            138,
            11,
            47,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー50以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              135,
              135
            ],
            "僧侶": [
              13.5,
              13.5
            ],
            "魔闘士": [
              135,
              135
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            159,
            12,
            54,
            0,
            0
          ],
          "tip": 1,
          "condition": "パワー60以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              90,
              225
            ],
            "僧侶": [
              9,
              22.5
            ],
            "魔闘士": [
              90,
              225
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "治癒の教え",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            37,
            73,
            86
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              45,
              45
            ],
            "弓使い": [
              45,
              45
            ],
            "重戦士": [
              45,
              45
            ],
            "魔法使い": [
              45,
              45
            ],
            "僧侶": [
              454.5,
              454.5
            ],
            "魔闘士": [
              45,
              45
            ],
            "双剣士": [
              45,
              45
            ]
          },
          "effect": {
            "HP回復倍率": 10,
            "物理攻撃倍率": 1,
            "魔法攻撃倍率": 1
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            47,
            85,
            94
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              135
            ],
            "弓使い": [
              90,
              135
            ],
            "重戦士": [
              90,
              135
            ],
            "魔法使い": [
              90,
              135
            ],
            "僧侶": [
              459,
              913.5
            ],
            "魔闘士": [
              90,
              135
            ],
            "双剣士": [
              90,
              135
            ]
          },
          "effect": {
            "HP回復倍率": 20,
            "物理攻撃倍率": 3,
            "魔法攻撃倍率": 3
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "自戒の念",
      "category": "超特殊能力",
      "kind": "金色サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            27,
            133,
            0,
            35,
            0
          ],
          "tip": 1,
          "condition": "生命力40以上・器用さ40以上",
          "scores": {
            "剣士": [
              540,
              540
            ],
            "弓使い": [
              540,
              540
            ],
            "重戦士": [
              540,
              540
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              540,
              540
            ]
          },
          "effect": {
            "物理攻撃倍率": 12,
            "魔法攻撃倍率": 12
          }
        },
        {
          "lv": 2,
          "cost": [
            31,
            154,
            0,
            41,
            0
          ],
          "tip": 1,
          "condition": "生命力50以上・器用さ50以上",
          "scores": {
            "剣士": [
              360,
              900
            ],
            "弓使い": [
              360,
              900
            ],
            "重戦士": [
              360,
              900
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              360,
              900
            ]
          },
          "effect": {
            "物理攻撃倍率": 20,
            "魔法攻撃倍率": 20
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔力増強",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            0,
            164,
            32
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 12,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            0,
            189,
            37
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 20,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔力改変",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            0,
            104,
            92
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 12,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            0,
            120,
            107
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 20,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    },
    {
      "name": "魔力探求",
      "category": "超特殊能力",
      "kind": "サポートスキル",
      "jobs": [
        "剣士",
        "弓使い",
        "重戦士",
        "魔法使い",
        "僧侶",
        "魔闘士",
        "双剣士"
      ],
      "attribute": null,
      "levels": [
        {
          "lv": 1,
          "cost": [
            0,
            0,
            0,
            73,
            123
          ],
          "tip": 1,
          "condition": "魔力50以上",
          "scores": {
            "剣士": [
              135,
              135
            ],
            "弓使い": [
              135,
              135
            ],
            "重戦士": [
              135,
              135
            ],
            "魔法使い": [
              540,
              540
            ],
            "僧侶": [
              54,
              54
            ],
            "魔闘士": [
              540,
              540
            ],
            "双剣士": [
              135,
              135
            ]
          },
          "effect": {
            "魔法攻撃倍率": 12,
            "物理攻撃倍率": 3
          }
        },
        {
          "lv": 2,
          "cost": [
            0,
            0,
            0,
            85,
            142
          ],
          "tip": 1,
          "condition": "魔力60以上",
          "scores": {
            "剣士": [
              90,
              225
            ],
            "弓使い": [
              90,
              225
            ],
            "重戦士": [
              90,
              225
            ],
            "魔法使い": [
              360,
              900
            ],
            "僧侶": [
              36,
              90
            ],
            "魔闘士": [
              360,
              900
            ],
            "双剣士": [
              90,
              225
            ]
          },
          "effect": {
            "魔法攻撃倍率": 20,
            "物理攻撃倍率": 5
          }
        }
      ],
      "hp": false,
      "resistance": false,
      "upper": null
    }
  ]
};

/*
 * 追加で判明したコツLv別の必要経験点（登録がある組み合わせだけ記載）。
 * データ構造：スキル名 → コツLv → 能力Lv → [筋力,敏捷,技術,知力,精神]。
 * 記載がないコツLv・能力Lvは未登録。推測による自動補完はしない。
 * 不朽の意志はゲーム実測と各成分の割引計算による確定値を含む。
 */
window.PAWAADO_DATA.skillHintCosts = {
  "平常心": {
    2: {
      1: [0, 12, 32, 0, 59],
      2: [0, 19, 48, 0, 88],
    },
  },
  "魔族キラー": {
    2: {
      1: [27, 0, 0, 50, 78],
      2: [32, 0, 0, 58, 90],
    },
  },
  "必殺の書": {
    2: {
      1: [57, 36, 0, 0, 62],
      2: [66, 42, 0, 0, 72],
    },
  },
  "精神統一": {
    2: {
      1: [0, 35, 0, 70, 70],
      2: [0, 45, 0, 90, 90],
    },
  },
  "一点集中": {
    2: {
      1: [0, 16, 39, 0, 48],
      2: [0, 25, 58, 0, 72],
    },
  },
  "救援者": {
    2: {
      1: [47, 54, 0, 54, 0],
      2: [54, 63, 0, 63, 0],
    },
  },
  "エースアタッカー": {
    2: {
      2: [0, 0, 68, 0, 113],
    },
  },
  "タフネス": {
    2: {
      1: [60, 0, 0, 0, 44],
      2: [90, 0, 0, 0, 66],
    },
    3: {
      1: [45, 0, 0, 0, 33],
      2: [67, 0, 0, 0, 49],
    },
    4: {
      1: [30, 0, 0, 0, 22],
      2: [45, 0, 0, 0, 33],
    },
    5: {
      1: [15, 0, 0, 0, 11],
      2: [22, 0, 0, 0, 16],
    },
  },
  "不朽の意志": {
    2: {
      1: [0, 0, 58, 98, 0],
      2: [0, 0, 68, 113, 0],
    },
    3: {
      1: [0, 0, 44, 73, 0],
      2: [0, 0, 51, 85, 0],
    },
    4: {
      1: [0, 0, 29, 49, 0],
      2: [0, 0, 34, 56, 0],
    },
    5: {
      1: [0, 0, 14, 24, 0],
      2: [0, 0, 17, 28, 0],
    },
  },
  "加護": {
    2: {
      1: [0, 83, 0, 36, 36],
      2: [0, 96, 0, 42, 42],
    },
    3: {
      1: [0, 62, 0, 27, 27],
      2: [0, 72, 0, 32, 32],
    },
    4: {
      1: [0, 41, 0, 18, 18],
      2: [0, 48, 0, 21, 21],
    },
    5: {
      1: [0, 20, 0, 9, 9],
      2: [0, 24, 0, 10, 10],
    },
  },
};

// スキル名の読み仮名正本。ランキングの同率順と取得候補の五十音順で共用する。
// カタカナのみの名称は名称そのものを比較キーとする。
window.PAWAADO_DATA.skillRankings.readings={
  "光の太刀": "ひかりのたち",
  "双翼の舞": "そうよくのまい",
  "爆炎一閃": "ばくえんいっせん",
  "疾風一閃": "しっぷういっせん",
  "巨岩投炎撃": "きょがんとうえんげき",
  "守りの態勢": "まもりのたいせい",
  "蒼炎の弓矢": "そうえんのゆみや",
  "夢幻の水矢": "むげんのみずや",
  "水脚乱舞": "すいきゃくらんぶ",
  "極上のおもてなし": "ごくじょうのおもてなし",
  "渦巻く剣刃": "うずまくけんじん",
  "守りの鼓舞": "まもりのこぶ",
  "豪雷積層雲": "きゅむろにんばす",
  "根性注入": "こんじょうちゅうにゅう",
  "聖炎の祝福": "せいえんのしゅくふく",
  "疾風の波動": "しっぷうのはどう",
  "爆熱フィスト": "ばくねつふぃすと",
  "凶壊無間獄": "きょうかいむげんごく",
  "生命の雫": "せいめいのしずく",
  "水斬撃": "すいざんげき",
  "双水斬": "そうすいざん",
  "双風斬": "そうふうざん",
  "水刃四連斬": "すいじんよんれんざん",
  "双水の構え": "そうすいのかまえ",
  "双風の構え": "そうふうのかまえ",
  "双炎の構え": "そうえんのかまえ",
  "真空斬り": "しんくうぎり",
  "双炎斬": "そうえんざん",
  "火連斬": "かれんざん",
  "剣豪の構え": "けんごうのかまえ",
  "火炎斬り": "かえんぎり",
  "疾風斬": "しっぷうざん",
  "心眼剣誓": "しんがんけんせい",
  "生命の息吹": "せいめいのいぶき",
  "烈風震破": "れっぷうしんぱ",
  "虚弱の風": "きょじゃくのかぜ",
  "秘弓・毒化粧": "ひきゅうどくげしょう",
  "燃焼拳": "ねんしょうけん",
  "風流拳": "ふうりゅうけん",
  "受け流しの構え": "うけながしのかまえ",
  "水流崩撃": "すいりゅうほうげき",
  "守護水斬": "しゅごすいざん",
  "流水払い": "りゅうすいばらい",
  "清流の加護": "せいりゅうのかご",
  "炎の盾": "ほのおのたて",
  "風の盾": "かぜのたて",
  "強靭の威光": "きょうじんのいこう",
  "炎魔連撃": "えんまれんげき",
  "火脚連撃": "かきゃくれんげき",
  "水流拳": "すいりゅうけん",
  "旋風双撃": "せんぷうそうげき",
  "烈風の舞": "れっぷうのまい",
  "魔力活性": "まりょくかっせい",
  "魔力改変": "まりょくかいへん",
  "魔力開眼": "まりょくかいがん",
  "精神統一": "せいしんとういつ",
  "超気合": "ちょうきあい",
  "研鑽": "けんさん",
  "戦い抜く覚悟": "たたかいぬくかくご",
  "強運の覇者": "きょううんのはしゃ",
  "剛力": "ごうりき",
  "加護": "かご",
  "そよかぜの加護": "そよかぜのかご",
  "大真面目": "おおまじめ",
  "鉄壁の盾": "てっぺきのたて",
  "慈愛の祈り": "じあいのいのり",
  "不滅": "ふめつ",
  "無頼漢の教え": "ぶらいかんのおしえ",
  "不朽の意志": "ふきゅうのいし",
  "魔力耐性": "まりょくたいせい",
  "百戦の生存術": "ひゃくせんのせいぞんじゅつ",
  "超免疫": "ちょうめんえき",
  "救援者": "きゅうえんしゃ",
  "対魔の盾": "たいまのたて",
  "不屈の精神": "ふくつのせいしん",
  "鉄人": "てつじん",
  "火事場の馬鹿力": "かじばのばかぢから",
  "安全運転": "あんぜんうんてん",
  "平常心": "へいじょうしん",
  "一点集中": "いってんしゅうちゅう",
  "烈": "れつ",
  "妖狐キラー": "ようこきらー",
  "植物キラー": "しょくぶつきらー",
  "怪力": "かいりき",
  "初志貫徹": "しょしかんてつ",
  "癒しの恩寵": "いやしのおんちょう",
  "必殺の秘技": "ひっさつのひぎ",
  "必殺の書": "ひっさつのしょ",
  "魔族キラー": "まぞくきらー",
  "治癒の教え": "ちゆのおしえ",
  "自戒の念": "じかいのねん",
  "魔力増強": "まりょくぞうきょう",
  "魔力探求": "まりょくたんきゅう"
};
