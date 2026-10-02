# パワアド査定ツールの変更ルール

ユーザーが毎回指示しなくても、変更対象の呼び出し元・呼び出し先・画面反映・キャッシュまで確認する。

- 作業開始時に README.md と最新差分を読み、対象機能の関連ファイルを検索する。
- ゲームデータの正本は data.js、使い方本文の正本は index.html。
- Workerの変更では pawaado_worker.js / pawaado_worker_resistance.js / script.js / resistance_patch.js / academy_runtime.js と HTML の読み込みを確認する。文字列置換パッチの起動テストを必ず実行する。
- ランキングの表示・備考・注記の正本は rankings.html。data.js と計算本体の査定定義、3分類の切り替え、同率時の順序まで確認する。
- 耐性効果・耐性1%あたり査定・ジョブ固有初期耐性の正本は data.js の resistanceRules。耐性Workerやランキング側へ同じ一覧・倍率を複製しない。
- 画像入力の変更では photo_import.js / script.js の入力反映関数 / data.js / academy_runtime.js / resistance_patch.js / assets を確認する。
- JS/CSSを変更したら全参照元の ?v= を更新する。photo_import.js の PHOTO_IMPORT_BUILD と HTML の版も揃える。参照元JS自体が変わった場合も、その参照元まで辿る。
- 削除はバックアップブランチを作り、動的な画像名・Workerロード・イベント経由の参照まで確認してから行う。OCRのライセンス文書は保持する。
- 公開前に `node scripts/check-integrity.cjs` と `node --test tests/*.test.cjs` を実行する。差分の基準がある場合は `node scripts/check-integrity.cjs --base <変更前コミット>` も実行する。
- 不具合修正は変更前に失敗し変更後に通る回帰テストを残す。画像精度の変更は実画像でも確認し、未確認ならその限界を明記する。
- 完了時は関連ファイルの確認結果、テスト結果、公開状況を伝える。ユーザーに関連ファイルの列挙を求めない。
