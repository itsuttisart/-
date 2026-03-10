# SchoolFlow - ระบบบริหารจัดการโรงเรียนครบวงจร

เว็บแอปสำหรับโรงเรียนที่ครอบคลุม:
- แจ้งผลการเรียนแยกปี/เทอม
- เช็คเข้าเรียนรายวิชา
- บันทึกความประพฤติ
- จัดการวิชาที่สอน/ห้องที่สอน
- จัดการข้อมูลนักเรียนและบุคลากร
- เช็คอินเวลาเข้า-ออกงานของบุคลากร
- เมนูตั้งค่าผู้ใช้งานทั่วไปและแอดมิน
- ล็อกอินด้วย username/password ครั้งแรก และจดจำผู้ใช้เพื่อเข้าใช้งานครั้งต่อไปด้วย PIN
- ใช้ Google Sheets เป็นฐานข้อมูลผ่าน Google Apps Script

## โครงสร้างไฟล์

- `index.html` หน้าแอปหลัก
- `styles.css` สไตล์ของแอป
- `app.js` logic ฝั่งหน้าเว็บ + เชื่อมต่อ Google Apps Script
- `google-apps-script/Code.gs` ตัวอย่าง backend สำหรับ Google Sheets

## วิธีใช้งาน

### 1) ตั้งค่า Google Sheets + Apps Script
1. สร้าง Google Spreadsheet ใหม่
2. เปิด Extensions > Apps Script
3. คัดลอกโค้ดจาก `google-apps-script/Code.gs` ไปวาง
4. Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone (หรือกำหนดตามนโยบายองค์กร)
5. คัดลอก URL ของ Web app
6. แก้ค่า `SHEET_API_BASE` ใน `app.js` ให้เป็น URL ที่ deploy

> หมายเหตุ: ในชีต `settings` ต้องเพิ่มคอลัมน์ `password` เพิ่มเองเพื่อใช้ตรวจล็อกอิน (ไม่แสดงในหน้าเมนูตั้งค่าโดยตั้งใจเพื่อความปลอดภัยเบื้องต้น)

### 2) รันหน้าเว็บ
เปิดไฟล์แบบ static server เช่น:

```bash
python3 -m http.server 4173
```

จากนั้นเข้า `http://localhost:4173`

## แนวทางความปลอดภัยที่ควรเพิ่มก่อนใช้งานจริง
- เปลี่ยนจากการเก็บ hash PIN ใน `localStorage` เป็น secure storage พร้อม session timeout
- เข้ารหัสรหัสผ่านในชีต `settings` และเพิ่ม 2FA สำหรับแอดมิน
- กำหนด role-based access control ให้จำกัดเมนูตามสิทธิ์
- เพิ่ม audit log สำหรับการแก้ไขข้อมูลสำคัญ
