# منظومة الأرشيف الإلكتروني (Elec-Archive)

منظومة إدارة وأرشفة رقمية متكاملة للعمليات، شئون الضباط، السجلات الطبية، والفاكسات العسكرية، مصممة بأحدث معايير الأمان وتجربة المستخدم الحديثة (Sapphire Archive Design System).

---

## 📋 جدول المحتويات (Table of Contents)
1. [المتطلبات الأساسية للنظام](#-المتطلبات-الأساسية-للنظام-system-prerequisites)
2. [التشغيل السريع على جهاز جديد (Fresh Setup Guide)](#-التشغيل-السريع-على-جهاز-جديد-fresh-setup-guide)
3. [بيانات تسجيل الدخول الافتراضية والحسابات الأولية](#-بيانات-تسجيل-الدخول-الافتراضية-initial-credentials)
4. [التشفير وتأمين الاتصال بشهادة SSL والتجديد التلقائي](#-التشفير-وتأمين-الاتصال-بشهادة-ssl-مع-التجديد-التلقائي-https--ssl-auto-renewal)
5. [إعداد متغيرات البيئة والأمان (Environment & Security Setup)](#-إعداد-متغيرات-البيئة-والأمان-environment--security-setup)
6. [التشغيل الإنتاجي عبر الحاويات (Production via Podman)](#-التشغيل-الإنتاجي-عبر-الحاويات-production-via-podman)
7. [الوصول عبر الشبكة المحلية والـ DHCP](#-الوصول-عبر-الشبكة-المحلية-والـ-dhcp)
8. [بيئة التطوير والتعديل السريع (Local Development Workflow)](#-بيئة-التطوير-والتعديل-السريع-local-development-workflow)
9. [النسخ الاحتياطي واستعادة البيانات (Backup & Restore)](#-النسخ-الاحتياطي-واستعادة-البيانات-backup--restore)
10. [بنية ملفات المشروع والحاويات (Architecture)](#-بنية-ملفات-المشروع-والحاويات-architecture)
11. [بوابات الجودة والفحص (Quality Gates)](#-بوابات-الجودة-والفحص-quality-gates)

---

## 🛠️ المتطلبات الأساسية للنظام (System Prerequisites)

قبل البدء على جهاز خادم أو جهاز مطور جديد، تأكد من توفر الأدوات التالية:

### 1. تثبيت Podman و Podman-Compose (الموصى به)
* **على أنظمة Ubuntu / Debian:**
  ```bash
  sudo apt update
  sudo apt install -y podman podman-compose git openssl
  ```
* **على أنظمة RHEL / AlmaLinux / Rocky Linux / Fedora:**
  ```bash
  sudo dnf install -y podman podman-compose git openssl
  ```

### 2. تثبيت Node.js (اختياري - فقط في حال رغبتك بالتطوير المحلي بدون حاويات):
```bash
# Node.js 20+ مع npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## ⚡ التشغيل السريع على جهاز جديد (Fresh Setup Guide)

اتبع هذه الخطوات البسيطة لتثبيت وتشغيل المنظومة بالكامل من الصفر في 5 دقائق:

### الخطوة 1: استنساخ المستودع (Clone Repository)
```bash
git clone -b polishing https://github.com/Kemoogo/Elec-Archive.git
cd Elec-Archive
```

### الخطوة 2: إنشاء ملف الإعدادات السري وتوليد مفتاح الأمان
```bash
# إنشاء ملف .env من النموذج
cp .env.example .env

# توليد مفتاح تشفير عشوائي حقيقي (256-bit)
openssl rand -base64 32
```
افتح ملف `.env` عبر محررك المفضل (`nano .env`):
```env
JWT_SECRET=<الصق_الكود_المولد_هنا>
NEXT_PUBLIC_APP_NAME=الأرشيف الإلكتروني
NGINX_PORT=8080
NGINX_SSL_PORT=8443
```

### الخطوة 3: بناء وتشغيل الحاويات بالكامل
```bash
podman-compose up -d --build
```

### الخطوة 4: زراعة الحسابات والبيانات الأولية (Seed Database)
عند أول تشغيل على جهاز جديد تكون قاعدة البيانات فارغة، لإنشاء مستخدم مدير النظام والبيانات الأولية شغّل من مسار مجلد `next`:
```bash
# تصفير وإنشاء مستخدم مدير النظام الافتراضي (Admin):
cd next && npm run db:reset

# أو لزراعة بيانات تجريبية كاملة (ضباط، مستندات، إجازات، فاكسات):
cd next && npm run seed:all
```

---

## 🔑 بيانات تسجيل الدخول الافتراضية (Initial Credentials)

بمجرد اكتمال خطوة الزراعة، يمكنك الدخول بالحساب الرئيسي:
- **الرابط الآمن المباشر (HTTPS):** `https://localhost:8443` (أو `https://<SERVER_IP>:8443`)
- **الرابط العادي (HTTP):** `http://localhost:8080` *(يتم تحويله تلقائياً وفورياً إلى HTTPS)*
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin123`
- *(⚠️ يُرجى تغيير كلمة المرور فور أول تسجيل دخول من صفحة الملف الشخصي/الإعدادات).*

---

## 🔒 التشفير وتأمين الاتصال بشهادة SSL مع التجديد التلقائي (HTTPS & SSL Auto-Renewal)

تعتمد المنظومة معمارية متقدمة لتأمين وحماية البيانات العسكرية والطبية المنقولة عبر الشبكة من خلال تشفير تام (End-to-End Encryption) بواسطة Nginx مع إدارة تلقائية للشهادات الرقمية:

### 1. معمارية الشهادات الرقمية المستقلة (Zero Host Bind Mounts):
* يتم توليد شهادات SSL الرقمية وحفظها بالكامل **داخل الحاوية المعزولة** (`/etc/nginx/ssl/`) دون الاعتماد على ربط مجلدات مع نظام التشغيل المضيف (No Volume Mounts)، مما يجعل الحاويات محمولة بالكامل وقابلة للنقل لأي خادم جديد دون أي إعداد يدوي للشهادات.
* صلاحية الشهادة الافتراضية: **5 سنوات كاملة (1825 يوماً)** باستخدام خوارزمية التشفير المتوافقة عسكرياً `RSA 2048-bit` و `SHA-256`.

### 2. محرك التجديد الذاتي التلقائي (Auto-Renewal Daemon Engine):
* يتضمن Nginx سكربت تشغيل ذكي (`entrypoint.sh`) يعمل كعملية خلفية (Background Daemon) داخل الحاوية.
* يقوم المحرك بفحص صلاحية الشهادة يومياً تلقائياً (`openssl x509 -checkend`).
* عندما يتبقى على انتهاء صلاحية الشهادة **30 يوماً أو أقل**، يقوم المحرك تلقائياً وبشكل صامت بـ:
  1. توليد شهادة ومفتاح رقمي جديدين لصلاحية 5 سنوات إضافية.
  2. إعادة تحميل إعدادات Nginx لحظياً (`nginx -s reload`) دون انقطاع الخدمة (Zero-Downtime Reload).

### 3. التحويل الإجباري الصارم إلى HTTPS وسياسات الأمان:
* **التحويل التلقائي الكامل (Unconditional 301 HTTPS Redirect):** 
  أي اتصال يدخل على المنفذ العادي غير المشفر (Port 80) يتم تحويله تلقائياً وبشكل قطعي عبر كود التوجيه الدائم `301 Moved Permanently` إلى الاتصال المشفر **HTTPS (Port 443)** على رابط نظيف تماماً بدون كتابة أي أرقام منافذ: `https://<SERVER_IP>`.
* **بروتوكولات التشفير المعتمدة:** يتم حظر البروتوكولات القديمة وغير الآمنة (`SSLv3`, `TLSv1.0`, `TLSv1.1`, `3DES`) واقتصار الاتصال حصرياً على بروتوكولات الأمان الحديثة (`TLSv1.2` و `TLSv1.3`).
* **حماية الترويسات الأمنية (Security Headers):**
  - منع هجمات تضمين النوافذ عبر `X-Frame-Options: SAMEORIGIN`.
  - حظر تزييف أنواع الملفات عبر `X-Content-Type-Options: nosniff`.
  - حماية هجمات الحقن عبر `X-XSS-Protection: 1; mode=block`.
* **التخزين المؤقت لجلسات SSL:** تفعيل `ssl_session_cache shared:SSL:10m` و `ssl_session_timeout 1d` لتسريع التصفح.
* **تمرير الاتصالات اللحظية (Server-Sent Events):** دعم الاتصال المباشر لتحديثات الفاكسات والتنبيهات دون حظر أو تأخير عبر `proxy_buffering off`.

> [!NOTE]
> **سبب ظهور تنبيه (net::ERR_CERT_AUTHORITY_INVALID) في المتصفح:**
> نظراً لأن المنظومة مخصصة للعمل داخل شبكات داخلية عسكرية ومحلية معزولة (Air-Gapped Intranet) بدون إنترنت خارجي وبدون نطاق عام (Public Domain)، يتم توليد الشهادة الرقمية **ذاتياً (Self-Signed)** داخل السيرفر.
> * متصفحات الإنترنت لا تتعرف تلقائياً إلا على الشهادات الصادرة من جهات تجارية عامة؛ لذا في أول مرة فقط عند فتح `https://`: اضغط على **"خيارات متقدمة" (Advanced)** ثم **"متابعة" (Proceed)**. يتم تذكر هذا الإذن في المتصفح تلقائياً.

---

## 🔐 إعداد متغيرات البيئة والأمان (Environment & Security Setup)

المشروع يعتمد على ملفين لمتغيرات البيئة حسب وضع التشغيل:
1. **ملف الـ Root (`.env`):** لتشغيل الحاويات بالكامل عبر `podman-compose` في بيئة الإنتاج، حيث يتولى الـ Compose حقن المتغيرات مباشرة في ذاكرة الحاوية دون حفظها على القرص.
2. **ملف التطبيق (`next/.env`):** لتشغيل خادم التطوير السريع محلياً (`npm run dev`).

> [!IMPORTANT]
> **قاعدة أمان سيبراني صارمة:** لا تستخدم المفاتيح الافتراضية في بيئة الإنتاج نهائياً. يُستخدم `JWT_SECRET` لتوقيع وتشفير جلسات وتوكنات الدخول لجميع المستخدمين والضباط؛ والمفتاح الضعيف أو المكشوف يعرض المنظومة لتزوير الصلاحيات.

---

## 🚀 التشغيل الإنتاجي عبر الحاويات (Production via Podman)

تشمل بنية الإنتاج 3 خدمات معزولة ومتكاملة وعالية الكفاءة:
- **`mongo`**: قاعدة بيانات MongoDB 7 مع حجم تخزين دائم مستقل (`mongo_data`).
- **`app`**: تطبيق Next.js الإنتاجي (Standalone Build على Alpine Linux بمستخدم غير جذري `nextjs` ذو UID 1001، ومتضمن محرك التنبيهات والتمام تلقائياً).
- **`nginx`**: خادم وسيط (Reverse Proxy) يتولى تشفير SSL، خدمة HTTP/HTTPS، ضغط الملفات، خدمة الوسائط، والاتصالات اللحظية (SSE).

---

### 🔹 الخيار الأول: وضع Rootless (بدون روت - الموصى به أمنياً)
يعمل التطبيق تحت حساب المستخدم العادي دون الحاجة لصلاحيات `sudo` أو `root`، مما يوفر أقصى درجات الأمان السيبراني (إذا تم اختراق الحاوية فلن يتمكن المهاجم من الوصول لنواة النظام أو ملفات السيرفر).

```bash
# 1. بناء وتشغيل الحاويات في الخلفية
podman-compose up -d --build

# 2. متابعة السجلات اللحظية
podman-compose logs -f

# 3. فحص الحاويات النشطة
podman ps

# 4. إيقاف الحاويات مؤقتاً
podman-compose stop

# 5. إيقاف وإزالة الحاويات مع الحفاظ على البيانات في الـ Volumes
podman-compose down

# 6. تصفير وزراعة حساب المدير الأول (Admin Seed)
cd next && npm run db:reset
```

* **المنافذ الافتراضية في وضع Rootless:**
  يتم حجز منافذ غير جذرية (`8080` للـ HTTP و `8443` للـ HTTPS).
* **مكان تخزين البيانات:**
  تُخزن مجلدات الـ Volumes في مسار المستخدم العادي: `~/.local/share/containers/storage/volumes/`.

---

### 🔹 الخيار الثاني: وضع Root (بصلاحيات الـ Root / sudo الكاملة)
مخصص لحالات تشغيل المنظومة كخدمة خادم رئيسية دائمة على مستوى نظام التشغيل بالكامل، أو عند الرغبة في حجز المنافذ القياسية `80` و `443` مباشرة أو استخدام شبكات `macvlan` دون إعدادات sysctl إضافية.

```bash
# 1. بناء وتشغيل الحاويات في الخلفية كـ Root
sudo podman-compose up -d --build

# 2. متابعة السجلات اللحظية
sudo podman-compose logs -f

# 3. فحص الحاويات النشطة
sudo podman ps

# 4. إيقاف الحاويات مؤقتاً
sudo podman-compose stop

# 5. إيقاف وإزالة الحاويات مع الحفاظ على البيانات
sudo podman-compose down

# 6. تصفير وزراعة حساب المدير الأول كـ Root (Admin Seed)
cd next && npm run db:reset
```

* **المنافذ في وضع Root:**
  يمكن ضبط ملف `.env` لحجز المنافذ القياسية مباشرة:
  ```env
  NGINX_PORT=80
  NGINX_SSL_PORT=443
  ```
* **مكان تخزين البيانات:**
  تُخزن مجلدات الـ Volumes مركزياً في: `/var/lib/containers/storage/volumes/`.

> [!CAUTION]
> **قاعدة هامة جداً - تجنب الخلط بين الوضعين:**
> محرك Podman يعزل مسارات التخزين والـ Volumes الخاصة بـ `root` عن مسارات المستخدم العادي `rootless`.
> - إذا قمت بالبناء والتشغيل باستخدام `podman-compose`، يجب أن تستمر في إدارتها وتشغيل أوامر الفحص والنسخ بدون `sudo`.
> - إذا قمت بالتشغيل عبر `sudo podman-compose`، فلن تظهر الحاويات أو البيانات عند تنفيذ `podman ps` بدون `sudo`.

---

## 🌐 الوصول عبر الشبكة المحلية والـ DHCP

بشكل افتراضي، يستمع Nginx على المنفذ المشفر `8443` (HTTPS) والمنفذ `8080` (HTTP) المفتوحين للشبكة المحلية بالكامل (`0.0.0.0`):
- **محلياً على جهاز السيرفر (موصى به):**
  - عبر HTTPS: `https://localhost:8443`
  - عبر HTTP: `http://localhost:8080` *(يُحوّل تلقائياً إلى HTTPS)*
- **من أي جهاز آخر على نفس الشبكة:** عبر عنوان الـ IP الذي يسحبه السيرفر من الـ DHCP:
  ```text
  https://<SERVER_IP>:8443
  مثال: https://192.168.0.26:8443
  ```

> [!TIP]
> **التشغيل المباشر على المنافذ القياسية (Port 443 و 80) بدون كتابة أرقام المنافذ:**
> في بيئة Linux ذات وضع Podman Rootless، يُشترط السماح للمستخدم العادي بحجز المنافذ الأقل من `1024`:
> ```bash
> sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
> echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.d/podman-ports.conf
> ```
> ثم في ملف `.env` عدّل:
> ```env
> NGINX_PORT=80
> NGINX_SSL_PORT=443
> ```
> وأعد تشغيل الحاويات (`podman-compose up -d`)؛ ليصبح الدخول مباشرة عبر الـ IP فقط بدون تحديد أي منفذ:
> - `https://<SERVER_IP>`
> - `http://<SERVER_IP>` *(يُحوّل فورياً إلى HTTPS)*

---

## 💻 بيئة التطوير والتعديل السريع (Local Development Workflow)

إذا كنت مبرمجاً وترغب في تعديل الكود مع الاستفادة من ميزة التحديث الفوري (Fast Refresh / Hot Reload):

1. **تشغيل حاوية قاعدة البيانات فقط:**
   ```bash
   podman-compose up -d mongo
   ```

2. **تشغيل خادم Next.js محلياً:**
   ```bash
   cd next
   npm install
   npm run dev
   ```
   افتح المتصفح مباشرة على: `http://localhost:3000`

3. **إيقاف قاعدة البيانات عند الانتهاء:**
   ```bash
   podman stop elec-archive-mongo
   ```

---

## 💾 النسخ الاحتياطي واستعادة البيانات (Backup & Restore)

لضمان سلامة بيانات المنظومة والضباط والفاكسات في بيئات العمل الحساسة:

### أخذ نسخة احتياطية (Full Database Backup):
```bash
# إنشاء نسخة احتياطية بتنسيق مضغوط وتاريخ اليوم
mkdir -p backups
podman exec -it elec-archive-mongo mongodump --db=elec-archive --archive=/tmp/backup.archive --gzip
podman cp elec-archive-mongo:/tmp/backup.archive ./backups/elec_archive_$(date +%Y%m%d).archive
```

### استعادة نسخة احتياطية (Restore Backup):
```bash
# استعادة قاعدة البيانات من ملف النسخة الاحتياطية
podman cp ./backups/elec_archive_backup.archive elec-archive-mongo:/tmp/restore.archive
podman exec -it elec-archive-mongo mongorestore --db=elec-archive --archive=/tmp/restore.archive --gzip --drop
```

---

## 📦 بنية ملفات المشروع والحاويات (Architecture)

```text
├── Containerfile           # وصف بناء تطبيق Next.js Standalone الآمن (Node 20 Alpine)
├── podman-compose.yml      # تعريف خدمات المنظومة والشبكات والتخزين الدائم والمنافذ
├── .containerignore        # استبعاد ملفات التطوير والكاش المؤقتة
├── nginx/
│   ├── Containerfile       # حاوية Nginx مخصصة تتضمن OpenSSL وسكربت التجديد الذاتي
│   ├── entrypoint.sh       # سكربت التوليد والتجديد التلقائي لشهادات SSL (صلاحية 5 سنوات ومراقبة يومية)
│   └── nginx.conf          # إعدادات الـ Reverse Proxy والـ SSL الإجباري والـ SSE وحجم الرفع (25M)
├── .env.example            # نموذج متغيرات البيئة للـ Production
├── README.md               # دليل التشغيل والتوثيق والتعليمات التقنية
└── next/                   # الكود المصدري لتطبيق Next.js
    ├── app/                # صفحات ومسارات النظام (Next.js App Router)
    ├── components/         # المكونات الرسومية ومكتبة التصميم (Sapphire Archive)
    ├── lib/                # الاتصال بقاعدة البيانات والنماذج والمنطق العسكري
    └── scripts/            # سكربتات التهيئة الأولية والنسخ التجريبية
```

---

## 🛡️ بوابات الجودة والفحص (Quality Gates)

قبل رفع أو اعتماد أي تعديلات في الكود البرمجي:
```bash
# فحص الأنواع الصارم (Strict Mode 0 Errors)
cd next && npx tsc --noEmit

# تدقيق الكود والأسلوب (ESLint)
cd next && npm run lint

# اختبار عملية بناء الإنتاج التراكمي
cd next && npm run build
```
