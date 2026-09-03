self.window=self;
importScripts('./pawaado_worker.js?v=20260903-bootrain-base');
// pawaado_worker.jsが読み込んだPAWAADO_DATAを同じオブジェクトのまま拡張する。
// 計算関数内のconst Dもこのオブジェクトを参照しているため、以降の計算に反映される。
importScripts('./bootrain_data_patch.js?v=20260903-1');
