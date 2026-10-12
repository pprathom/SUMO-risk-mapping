import { X, Upload, AlertTriangle, Map as MapIcon, Download, Eye } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function HelpModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900">
          <h2 className="text-sm font-black text-white tracking-widest uppercase">คู่มือการใช้งาน</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-[12px] text-slate-300 custom-scrollbar">

          <section>
            <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Upload size={12} /> การใช้งานทั่วไป
            </h3>
            <ol className="list-decimal ml-4 space-y-1">
              <li>อัปโหลด <code className="text-emerald-400">osm.net.xml</code> (network file จาก SUMO) และ <code className="text-amber-400">ssm_output.xml</code> (SSM output)</li>
              <li>กด <strong>"Process Visualization"</strong> เพื่อแสดงจุดเสี่ยงจากการจำลอง</li>
              <li>คลิกที่จุดบนแผนที่เพื่อดูรายละเอียด conflict</li>
              <li>ใช้ filter แถบซ้ายเพื่อเลือกประเภทหรือระดับความเสี่ยง</li>
              <li>กด <strong>Export</strong> เพื่อดาวน์โหลดข้อมูลเป็น CSV</li>
              <li>ปุ่ม <strong>Clear SUMO Data</strong> ล้างข้อมูลการจำลอง</li>
            </ol>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} /> SUMO Conflict Types
            </h3>
            <div className="space-y-1">
              <p><code className="text-blue-400">Type 2</code> — FOLLOWING_FOLLOWER: ยานพาหนะหลัก (ego) กำลังขับตามคู่กรณี (foe)</p>
              <p><code className="text-blue-400">Type 3</code> — FOLLOWING_LEADER: คู่กรณี (foe) กำลังขับตามยานพาหนะหลัก (ego)</p>
              <p><code className="text-blue-400">Type 6</code> — MERGING_LEADER: คู่กรณีถึงจุดรวมเลนก่อน ego</p>
              <p><code className="text-blue-400">Type 7</code> — MERGING_FOLLOWER: ego ถึงจุดรวมเลนก่อนคู่กรณี</p>
              <p><code className="text-blue-400">Type 10</code> — CROSSING_LEADER: ego ถึงจุดตัดก่อนคู่กรณี</p>
              <p><code className="text-blue-400">Type 11</code> — CROSSING_FOLLOWER: คู่กรณีถึงจุดตัดก่อน ego</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-orange-400 uppercase tracking-widest mb-2">Conflict Metrics</h3>
            <div className="space-y-1">
              <p><code className="text-orange-400">TTC</code> (Time To Collision) — เวลาที่เหลือก่อนชน ยิ่งน้อยยิ่งเสี่ยง</p>
              <p><code className="text-orange-400">DRAC</code> (Deceleration Rate to Avoid Crash) — ความเร็วในการเบรกที่จำเป็นเพื่อหลีกเลี่ยงการชน</p>
              <p><code className="text-orange-400">PET</code> (Post Encroachment Time) — เวลาหลังผ่านจุดชน ยิ่งน้อยยิ่งเสี่ยง</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-2">Risk Levels</h3>
            <div className="space-y-1">
              <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5"></span><strong>High Risk</strong> — TTC &lt; 1.5 วินาที (เสี่ยงสูงมาก)</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5"></span><strong>Moderate</strong> — TTC 1.5–3.0 วินาที</p>
              <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-500 mr-1.5"></span><strong>Low Risk</strong> — TTC &gt; 3.0 วินาที</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-purple-400 uppercase tracking-widest mb-2">Accident Parameters (iTIC)</h3>
            <div className="space-y-1">
              <p><code className="text-purple-400">จังหวัด</code> — รหัสจังหวัดตามกรมการปกครอง (geocode)</p>
              <p><code className="text-purple-400">ช่วงวันที่</code> — ค้นหาข้อมูลอุบัติเหตุในช่วงเวลาที่กำหนด</p>
              <p><code className="text-purple-400">ความรุนแรง</code> — ทั้งหมด / เสียชีวิต / บาดเจ็บ</p>
              <p><code className="text-purple-400">จำนวนข้อมูลต่อครั้ง</code> — จำกัดจำนวน records ที่โหลด (1,000–50,000)</p>
              <p><code className="text-purple-400">Load More</code> — โหลดข้อมูลเพิ่มเติม (pagination)</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Eye size={12} /> View Modes
            </h3>
            <div className="space-y-1">
              <p><strong>Points</strong> — แสดงจุดอุบัติเหตุแต่ละจุด (สีม่วง = เสียชีวิต, ฟ้า = บาดเจ็บ)</p>
              <p><strong>Heat</strong> — แสดง heat map ตามความหนาแน่นของอุบัติเหตุ (ฟ้า → ส้ม → ม่วง → แดง)</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">อื่นๆ</h3>
            <div className="space-y-1">
              <p><strong>Map Style</strong> — เปลี่ยนธีมแผนที่: CARTO Voyager / CARTO Dark / OpenStreetMap</p>
              <p><strong>Reverse Geocode</strong> — เมื่ออัปโหลด net.xml ระบบจะเลือกจังหวัดให้อัตโนมัติจากพิกัด</p>
              <p><strong>Clear Accidents</strong> — ล้างข้อมูลอุบัติเหตุ (คงค่าจังหวัด/วันที่ไว้)</p>
              <p><strong>Canvas Renderer</strong> — เปิดใช้งานอัตโนมัติเพื่อเพิ่มความเร็วในการแสดงผล</p>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Download size={12} /> Export CSV
            </h3>
            <p>กดปุ่ม Export เพื่อดาวน์โหลดข้อมูล conflict ที่ filter อยู่ในไฟล์ CSV (ประกอบด้วย ID, เวลา, ประเภท, TTC, DRAC, PET, พิกัด GPS)</p>
          </section>

        </div>
      </div>
    </div>
  );
}
