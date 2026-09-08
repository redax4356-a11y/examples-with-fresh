````markdown
# 🚀 Solana Arbitrage Bot - بوت المراجحة على Solana

بوت متقدم لكشف وتنفيذ فرص المراجحة (Arbitrage) على شبكة Solana مع دعم Flash Loans والتمويل بدون رأس مال.

## 📋 المحتويات

- [الميزات](#الميزات)
- [المتطلبات](#المتطلبات)
- [التثبيت](#التثبيت)
- [التكوين](#التكوين)
- [الاستخدام](#الاستخدام)
- [البنية المعمارية](#البنية-المعمارية)
- [الأمان](#الأمان)
- [الاختبار](#الاختبار)
- [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## ✨ الميزات

### 1️⃣ **Flash Loans (القروض المجانية)**
```
الآلية: 
  المحفظة → اقتراض (Flash Loan) → مراجحة → سداد + رسم → ربح
  
الفوائد:
  ✓ لا تحتاج رأس مال ضخم مسبقاً
  ✓ تمويل ذري في معاملة واحدة
  ✓ سداد تلق��ئي عند النجاح
  ✓ استرجاع تلقائي عند الفشل
```

### 2️⃣ **كشف الفرص الذكي**
```
المراقبة المستمرة:
  • تحديث أسعار المجمعات كل 5 ثوان
  • مقارنة أسعار بين Raydium و Orca و Jupiter
  • حساب فرق السعر والربح المحتمل
  • التحقق من جودة البيانات والسيولة
```

### 3️⃣ **إدارة المخاطر الصارمة**
```
حماية متعددة الطبقات:
  ✓ حد أدنى للربح الصافي (Min Profit Threshold)
  ✓ حد أقصى للانزلاق (Max Slippage)
  ✓ تحقق من رسوم الغاز والفلاش لون
  ✓ محاكاة الصفقة قبل التنفيذ
  ✓ استرجاع تلقائي عند الفشل
```

### 4️⃣ **Backrunning & Path Tracking**
```
التتبع الذكي:
  • تسجيل جميع الصفقات الناجحة
  • تحليل السجل التاريخي للأسعار
  • اكتشاف أنماط وتقلبات الأسعار
  • تتبع آخر 10 كتل على الأقل
```

### 5️⃣ **واجهة رقابة شاملة**
```
مراقبة فعالة:
  📊 عرض الإحصائيات الحية
  📈 رسوم بيانية للأرباح
  🔔 إشعارات الفرص المربحة
  📝 سجلات تفصيلية لكل معاملة
```

---

## 📦 المتطلبات

### البرامج المطلوبة
- **Deno** v1.40+ → [التثبيت](https://docs.deno.com/runtime/getting_started/installation)
- **Node.js** (اختياري) للتطوير
- **Git** للنسخ والتحديثات

### متطلبات Solana
- محفظة Solana بها SOL (حتى 0.1 SOL كافي)
- المفتاح الخاص (Private Key) بصيغة Base58
- اتصال إنترنت سريع وموثوق

### الحسابات المدعومة
- ✅ Raydium Pools
- ✅ Orca Pools
- ✅ Jupiter Swap
- ✅ Marinade (قريباً)

---

## 🔧 التثبيت

### 1. استنساخ المستودع
```bash
git clone https://github.com/redax4356-a11y/examples-with-fresh.git
cd examples-with-fresh
```

### 2. نسخ ملف الإعدادات
```bash
cp .env.example .env
```

### 3. تحرير الإعدادات
```bash
nano .env
# أو استخدم أي محرر نصوص تفضله
```

### 4. ملء البيانات المطلوبة
```env
SOLANA_PRIVATE_KEY=your_base58_private_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MIN_PROFIT_THRESHOLD=0.001
MAX_SLIPPAGE_TOLERANCE=2.0
```

---

## ⚙️ التكوين

### ملف `.env` الرئيسي

```env
# شبكة Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_key_here

# إعدادات المراجحة
MIN_PROFIT_THRESHOLD=0.001        # الحد الأدنى للربح (SOL)
MAX_SLIPPAGE_TOLERANCE=2.0        # الحد الأقصى للانزلاق (%)
MAX_GAS_PRICE=10000              # أقصى سعر غاز (lamports)
FLASH_LOAN_MAX_FEE=0.1           # أقصى رسم فلاش (%)

# المراقبة والأداء
POOL_UPDATE_INTERVAL=5000        # تحديث الأسعار (ms)
BACKRUN_WINDOW_SIZE=10           # عدد الكتل المراقبة

# أخرى
DEBUG=false
SIMULATION_MODE=false
```

### إعدادات متقدمة

#### تغيير المجمعات المراقبة
عدّل `arbitrage-bot/main.ts`:
```typescript
const poolsToMonitor: BotPool[] = [
  {
    address: "raydium_pool_address",
    protocol: "raydium",
    tokenA: "SOL_mint",
    tokenB: "USDC_mint",
  },
  // أضف المزيد...
];
```

#### ضبط حساسية الكشف
في `arbitrage-bot/opportunity-detector.ts`:
```typescript
// زيادة الحساسية (كشف فرص أصغر)
priceDifference > 0.5  // بدلاً من 1%

// تقليل الحساسية (فقط فرص كبيرة)
priceDifference > 3.0  // 3% على الأقل
```

---

## 🚀 الاستخدام

### البدء السريع

```bash
# 1. تثبيت المكتبات
deno cache --reload arbitrage-bot/main.ts

# 2. تشغيل البوت
deno run -A --env arbitrage-bot/main.ts

# 3. ستشاهد السجل:
# ✅ Solana Arbitrage Bot - Starting
# 🔍 Checking wallet balance
# 📊 Connected to Solana mainnet
# 🎯 Monitoring 3 pools
# ⏳ Waiting for arbitrage opportunities...
```

### تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
deno test --allow-env arbitrage-bot/tests.ts

# تشغيل اختبار محدد
deno test --allow-env --filter "PricingUtility" arbitrage-bot/tests.ts
```

### وضع المحاكاة (Simulation Mode)

```bash
# اختبر الصفقات بدون تنفيذ فعلي
SIMULATION_MODE=true deno run -A --env arbitrage-bot/main.ts
```

### وضع التصحيح

```bash
# عرض تفاصيل إضافية للتصحيح
DEBUG=true deno run -A --env arbitrage-bot/main.ts
```

---

## 🏗️ البنية المعمارية

```
arbitrage-bot/
├── types.ts              # تعريفات TypeScript
├── core.ts               # المنطق الأساسي والأدوات
├── pool-monitor.ts       # مراقب أسعار المجمعات
├── flash-loan.ts         # مدير Flash Loans
├── opportunity-detector.ts # كاشف الفرص والتتبع
├── bot.ts                # محرك البوت الرئيسي
├── main.ts               # نقطة البدء
└── tests.ts              # الاختبارات

المكونات الرئيسية:

1. BotConfigManager
   └─ التحقق من صحة الإعدادات
   └─ توفير القيم الافتراضية

2. SolanaConnectionManager
   └─ إدارة الاتصال بـ RPC
   └─ فحص الأرصدة والتوقيع

3. PoolPriceMonitor
   └─ جلب أسعار المجمعات
   └─ الذاكرة المؤقتة والتاريخ

4. OpportunityDetector
   └─ تجميع وتحليل الأسعار
   └─ حساب الأرباح المحتملة
   └─ التحقق من صحة الفرص

5. FlashLoanManager
   └─ بناء المعاملات الذرية
   └─ محاكاة الصفقات
   └─ تنفيذ وتتبع النتائج

6. BackrunEngine
   └─ تسجيل المعاملات
   └─ حساب الإحصائيات
   └─ تحليل الأنماط
```

---

## 🔒 الأمان

### ⚠️ تحذيرات أمان حرجة

```
❌ لا تفعل أبداً:
  • لا تشارك PRIVATE_KEY مع أحد
  • لا تضع المفتاح في الكود مباشرة
  • لا تستخدم حساب التطوير مع أموال حقيقية
  • لا تترك البوت يعمل بدون مراقبة

✅ الممارسات الآمنة:
  • استخدم متغيرات البيئة فقط
  • احفظ ملف .env في .gitignore
  • اختبر على Devnet أولاً
  • استخدم محفظة منفصلة للبوت
  • راقب السجلات بانتظام
  • ابدأ برصيد صغير جداً
```

### التشفير والتوقيع

```typescript
// جميع المعاملات موقعة بـ Ed25519
// الاتصال مشفر بـ HTTPS/WSS
// المفاتيح محفوظة في الذاكرة فقط
```

### مراقبة الأمان

```bash
# فحص الملفات الحساسة
ls -la | grep -E "\.env|\.key|secret"

# تتبع المعاملات المشبوهة
grep -i "error\|failed\|unusual" bot-logs.txt

# التحقق من صحة التوقيع
deno run --allow-read arbitrage-bot/verify-sig.ts
```

---

## ���� الاختبار

### الاختبارات المضمنة

```bash
# اختبار التكوين
deno test --allow-env --filter "Config" arbitrage-bot/tests.ts

# اختبار الحسابات
deno test --allow-env --filter "Pricing" arbitrage-bot/tests.ts

# اختبار التحقق
deno test --allow-env --filter "Validation" arbitrage-bot/tests.ts
```

### الاختبار على Devnet

```bash
# 1. عدّل .env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_WS_URL=wss://api.devnet.solana.com

# 2. احصل على Devnet SOL
# https://faucet.solana.com/

# 3. شغّل البوت
deno run -A --env arbitrage-bot/main.ts
```

---

## 🐛 استكشاف الأخطاء

### المشكلة: "RPC Connection Failed"

```bash
# الحل:
1. تحقق من رابط RPC
2. جرب RPC بديل:
   - https://solana-api.projectserum.com
   - https://rpc.ankr.com/solana
3. تأكد من الإنترنت
```

### المشكلة: "Insufficient Balance"

```bash
# الحل:
1. تحقق من رصيد المحفظة:
   deno eval --allow-env "console.log(await getBalance())"

2. أضف المزيد من SOL:
   - من Phantom/Solflare
   - من منصة صرافة

3. تأكد من العنوان الصحيح
```

### المشكلة: "No Arbitrage Opportunities Found"

```bash
# الحل:
1. قلل MIN_PROFIT_THRESHOLD
2. زد عدد المجمعات المراقبة
3. تحقق من جودة البيانات:
   DEBUG=true deno run -A --env arbitrage-bot/main.ts

4. تأكد من سيولة المجمعات
```

### المشكلة: "Transaction Failed"

```bash
# الأسباب المحتملة:
1. انزلاق أعلى من الحد المسموح
   → قلل MAX_SLIPPAGE_TOLERANCE

2. رسوم غاز عالية جداً
   → انتظر حتى تنخفض الأسعار

3. فشل Flash Loan
   → تحقق من دعم البروتوكول

4. تغير الأسعار أثناء المعاملة
   → زد وقت الانتظار قليلاً
```

### أوامر مفيدة للتصحيح

```bash
# عرض السجلات الكاملة
deno run -A --env arbitrage-bot/main.ts 2>&1 | tee bot.log

# البحث عن أخطاء محددة
grep "ERROR\|FAILED" bot.log

# متابعة البوت بالوقت الفعلي
tail -f bot.log

# إيقاف البوت بأمان
kill -SIGTERM $(pgrep -f "deno run")
```

---

## 📊 مراقبة الأداء

### الإحصائيات المتاحة

```typescript
bot.getStats() // يعيد:
{
  successfulTrades: 15,          // عدد الصفقات الناجحة
  totalProfit: 0.15234,          // إجمالي الربح (SOL)
  averageProfitPerTrade: 0.0102, // متوسط الربح لكل صفقة
  recentTransactionCount: 50     // عدد المعاملات الأخيرة
}
```

### السجلات اليومية

```bash
# حفظ السجلات يومياً
deno run -A --env arbitrage-bot/main.ts 2>&1 | tee logs/$(date +%Y-%m-%d).log

# تحليل السجلات
cat logs/*.log | grep "SUCCESS" | wc -l  # عدد الصفقات الناجحة
cat logs/*.log | grep "PROFIT" | awk '{sum+=$3} END {print sum}'  # الربح الكلي
```

---

## 🚢 النشر على الخادم

### باستخدام Deno Deploy

```bash
# 1. نشر على Deno
deno deploy --project=your-project arbitrage-bot/main.ts

# 2. تعيين المتغيرات
deno deploy --project=your-project --env .env
```

### باستخدام Docker

```dockerfile
FROM denoland/deno:1.40

WORKDIR /app
COPY . .

CMD ["deno", "run", "-A", "--env", "arbitrage-bot/main.ts"]
```

```bash
# بناء وتشغيل
docker build -t arbitrage-bot .
docker run --env-file .env arbitrage-bot
```

---

## 📞 الدعم والمساعدة

### الموارد المفيدة

- 📖 [��وثيق Solana](https://docs.solana.com)
- 🔗 [Raydium API](https://github.com/raydium-io/raydium-sdk)
- 🐋 [Orca Whirlpools](https://docs.orca.so)
- ⚡ [Jupiter Swap](https://jup.ag/docs)
- 🦤 [Deno Docs](https://docs.deno.com)

### الإبلاغ عن الأخطاء

```bash
# أنشئ issue جديد مع:
1. وصف المشكلة
2. رسالة الخطأ الكاملة
3. السجلات ذات الصلة
4. خطوات إعادة الإنتاج
```

---

## 📈 التطوير المستقبلي

### المميزات المخطط إضافتها

- [ ] دعم المزيد من البروتوكولات (Marinade, Step Finance)
- [ ] واجهة ويب متقدمة (Fresh)
- [ ] نظام إخطارات (Telegram, Discord)
- [ ] تعلم الآلة لكشف الأنماط
- [ ] تكامل مع DeFi Aggregators
- [ ] نسخ احتياطي آلي للمحفظة
- [ ] تقارير يومية/أسبوعية

---

## 📄 الترخيص

هذا المشروع مرخص تحت **MIT License**.

```
Free to use, modify, and distribute
But use at your own risk!
```

---

## ⚡ نصائح للأداء الأفضل

### تحسين السرعة
```
1. استخدم RPC سريع ومخصص
2. قلل POOL_UPDATE_INTERVAL (لكن بحذر)
3. استخدم Websocket بدلاً من RPC فقط
4. شغّل على سيرفر قريب من Solana
```

### تقليل التكاليف
```
1. راقب أسعار الغاز (Gas Fees)
2. استخدم Flash Loans فقط عند الحاجة
3. قلل حجم الصفقات الاختبارية
4. اختر أوقات أقل ازدحاماً
```

### زيادة الأرباح
```
1. أضف المزيد من المجمعات
2. اخفض MIN_PROFIT_THRESHOLD تدريجياً
3. استخدم عدة محافظ بالتوازي
4. تابع أخبار DeFi لاكتشاف فرص جديدة
```

---

## 🎓 شرح العمليات الأساسية

### كيف يعمل Flash Loan؟

```
الخطوة 1: طلب قرض (Borrow)
  Bot → Protocol: "أقرضني 1 SOL"
  
الخطوة 2: التنفيذ (Swap)
  1 SOL → Pool A (شراء) → 100 USDC
  100 USDC → Pool B (بيع) → 1.05 SOL
  
الخطوة 3: السداد (Repay)
  1.05 SOL - 0.0005 SOL (رسم) = 1.0495 SOL
  Bot → Protocol: "إليك القرض + الرسم"
  
النتيجة: ربح = 0.0495 SOL - رسم غاز
```

### كيف يتم حساب الربح؟

```
الربح الإجمالي = (سعر البيع - سعر الشراء) × الكمية

الربح الصافي = الربح الإجمالي 
              - رسم Swap #1 (0.25%)
              - رسم Swap #2 (0.25%)
              - رسم Flash Loan (0.05%)
              - رسم الغاز (≈0.001 SOL)

مثال:
  شراء: 100 SOL × 1.00 = 100 SOL
  بيع: 100 SOL × 1.02 = 102 SOL
  ---
  إجمالي: 2 SOL
  بعد الرسوم: ≈1.4 SOL (صافي الربح)
```

---

## 🔗 الروابط المهمة

| المورد | الرابط |
|------|--------|
| GitHub | https://github.com/redax4356-a11y/examples-with-fresh |
| Solana | https://solana.com |
| Raydium | https://raydium.io |
| Orca | https://www.orca.so |
| Jupiter | https://jup.ag |

---

**آخر تحديث:** 8 سبتمبر 2026

**الإصدار:** 1.0.0

**الحالة:** ✅ جاهز للإنتاج

---

> ⚠️ **تذكير مهم:** هذا البوت يتعامل بأموال حقيقية. استخدمه بحذر ومسؤولية.
> الأرباح ليست مضمونة، وقد تحدث خسائر. ابدأ برصيد صغير جداً.

````
