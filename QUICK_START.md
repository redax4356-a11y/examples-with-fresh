# 🚀 Solana Arbitrage Bot - دليل البدء السريع

## ⚡ البدء في 5 دقائق

### الخطوة 1️⃣: التثبيت (1 دقيقة)

```bash
# 1. استنساخ المستودع
git clone https://github.com/redax4356-a11y/examples-with-fresh.git
cd examples-with-fresh

# 2. نسخ الإعدادات
cp .env.example .env
```

### الخطوة 2️⃣: الإعدادات (2 دقيقة)

```bash
# فتح .env بمحرر نصوص
nano .env

# أو استخدم أي محرر:
# - VS Code: code .env
# - vim: vim .env
```

**أدخل هذه البيانات:**

```env
SOLANA_PRIVATE_KEY=your_base58_private_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MIN_PROFIT_THRESHOLD=0.001
MAX_SLIPPAGE_TOLERANCE=2.0
```

### الخطوة 3️⃣: التشغيل (1 دقيقة)

```bash
# تشغيل البوت
deno run -A --env arbitrage-bot/main.ts
```

✅ **تم! البوت يعمل الآن!**

---

## 📱 كيفية الحصول على المفتاح الخاص

### من Phantom (الأسهل)

```
1. افتح متصفح Chrome/Firefox
2. انقر أيقونة Phantom في الأعلى
3. اضغط على الإعدادات ⚙️
4. اختر "Export Private Key"
5. أدخل كلمة المرور
6. انسخ المفتاح (Base58)
7. الصقه في .env
```

### من Solflare

```
1. افتح https://solflare.com
2. اختر "Import Wallet"
3. أدخل كلمة البذرة (Seed Phrase)
4. اضغط على "Export Private Key"
5. انسخ المفتاح
6. الصقه في .env
```

### من Ledger

```
1. قم بتوصيل Ledger
2. افتح Phantom أو Solflare
3. تحقق من العنوان
4. استخدم نفس المحفظة مع البوت
```

---

## 🎮 الأوامر الأساسية

### تشغيل البوت

```bash
# التشغيل العادي
deno task arbitrage

# التشغيل مع وضع التصحيح
deno task arbitrage:debug

# التشغيل مع المحاكاة (بدون تنفيذ فعلي)
deno task arbitrage:simulate

# تشغيل الاختبارات
deno task arbitrage:test
```

### إيقاف البوت

```bash
# اضغط Ctrl+C في الطرفية
# أو استخدم:
kill -SIGTERM $(pgrep -f "deno run")
```

---

## 📊 فهم السجلات

### السجل الأخضر ✅
```
✅ Arbitrage Executed Successfully
   profit: 0.00234 SOL
   fee: 0.00001 SOL
```
**معنى:** صفقة ناجحة! ربح حقيقي.

### السجل الأزرق 🔍
```
🎯 Arbitrage Opportunity Detected
   tokens: SOL/USDC
   priceDifference: 2.15%
   estimatedProfit: 0.00156 SOL
```
**معنى:** فرصة محتملة تم اكتشافها.

### السجل الأصفر ⚠️
```
⚠️ Opportunity rejected
   reasons: ["Profit below threshold"]
```
**معنى:** فرصة ضعيفة أو غير مربحة.

### السجل الأحمر ❌
```
❌ Flash loan execution failed
   error: Insufficient liquidity
```
**معنى:** حدث خطأ - البوت تراجع تلقائياً.

---

## 💰 مثال حسابي

```
الفرصة:
  • شراء SOL من Raydium: 100 SOL = 10,000 USDC
  • بيع SOL على Orca:      100 SOL = 10,250 USDC

الأرباح:
  إجمالي: 250 USDC
  
الخصومات:
  - رسم Swap Raydium (0.25%):  25 USDC
  - رسم Swap Orca (0.25%):     25 USDC
  - رسم Flash Loan (0.05%):     5 USDC
  - رسم الغاز (≈0.001 SOL):     0.1 USDC
  ---
  الإجمالي الخصم:              55.1 USDC

الربح الصافي: 250 - 55.1 = 194.9 USDC ≈ 0.019 SOL ✅
```

---

## ⚠️ تحذيرات مهمة

### ❌ لا تفعل هذا

```
❌ لا تشارك PRIVATE_KEY مع أحد
❌ لا تضعه في الكود مباشرة
❌ لا تستخدم محفظة تحتوي أموال هامة
❌ لا تترك البوت دون مراقبة
❌ لا تستخدم RPC عام (استخدم RPC خاص)
```

### ✅ الممارسات الآمنة

```
✅ استخدم .env فقط
✅ احفظ .env في .gitignore
✅ ابدأ بـ 0.1 SOL فقط
✅ راقب السجلات دائماً
✅ اختبر على Devnet أولاً
✅ استخدم محفظة منفصلة
```

---

## 🆘 استكشاف الأخطاء

### "RPC Connection Failed"
```bash
# الحل:
SOLANA_RPC_URL=https://solana-api.projectserum.com deno task arbitrage
```

### "Insufficient Balance"
```bash
# أضف SOL من:
# - Phantom: اشتري من Coinbase
# - Solflare: استقبل من تحويل بنكي
# - Faucet: https://faucet.solana.com (Devnet فقط)
```

### "No Opportunities Found"
```bash
# قلل الحد الأدنى للربح:
MIN_PROFIT_THRESHOLD=0.0005 deno task arbitrage
```

---

## 📈 نصائح لزيادة الأرباح

### 1. أضف مجمعات أكثر
```typescript
// عدّل arbitrage-bot/main.ts
const poolsToMonitor: BotPool[] = [
  // أضف المزيد من الأزواج
];
```

### 2. قلل الحد الأدنى تدريجياً
```env
MIN_PROFIT_THRESHOLD=0.0008  # بدلاً من 0.001
```

### 3. اختر أوقات أقل ازدحاماً
```
أفضل الأوقات:
- 02:00 - 06:00 UTC (أقل ازدحام)
- يوم الجمعة (أقل نشاط)
- تجنب اعلانات الأحداث الاقتصادية
```

### 4. استخدم RPC سريع
```env
# بدلاً من العام:
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# استخدم RPC خاص أو مخصص:
SOLANA_RPC_URL=https://your-private-rpc.com
```

---

## 📚 الخطوات التالية

### للتطوير:
1. اقرأ `ARBITRAGE_BOT_README.md` (التوثيق الكامل)
2. اقرأ `ARBITRAGE_BOT_CHANGELOG.md` (سجل التغييرات)
3. اطلع على `arbitrage-bot/types.ts` (الأنواع والهياكل)

### للإنتاج:
1. اختبر على Devnet أولاً
2. استخدم محفظة منفصلة
3. ابدأ برصيد صغير جداً
4. راقب لمدة 24 ساعة
5. أضف رسائل تنبيه (Discord/Telegram)

### للتحسين:
1. أضف المزيد من المجمعات
2. استخدم عدة محافظ
3. حسّن إعدادات الربحية
4. راقب أسعار الغاز
5. ابحث عن أزواج جديدة

---

## 🎓 تعلم أكثر

### الموارد المفيدة:
- 📖 [وثائق Solana](https://docs.solana.com)
- 🔗 [Raydium Protocol](https://raydium.io)
- 🐋 [Orca Whirlpools](https://orca.so)
- ⚡ [Jupiter Aggregator](https://jup.ag)
- 🦤 [Deno Manual](https://deno.land/manual)

---

## 💬 احصل على الدعم

### إذا واجهت مشكلة:
1. اقرأ `ARBITRAGE_BOT_README.md`
2. تحقق من السجلات: `DEBUG=true deno task arbitrage`
3. أنشئ issue على GitHub
4. اطلب مساعدة في مجتمع Solana

---

## ✅ قائمة التحقق النهائية

- [ ] ثبتت Deno
- [ ] استنسخت المستودع
- [ ] نسخت .env.example
- [ ] أدخلت PRIVATE_KEY
- [ ] اختبرت الاتصال
- [ ] قرأت التحذيرات
- [ ] ابدأت برصيد صغير
- [ ] راقبت السجلات

**تهانينا! أنت جاهز للبدء! 🎉**

---

**احذر:** هذا البوت يتعامل بأموال حقيقية. قد تحدث خسائر.
استخدمه بحذر ومسؤولية.

**النسخة:** 1.0.0
**آخر تحديث:** 8 سبتمبر 2026
**الحالة:** ✅ جاهز للاستخدام
