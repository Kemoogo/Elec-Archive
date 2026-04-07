
type ParsedSeniority = {
    valid: boolean;
    base: number;
    letters: string; // الحروف مجمعة للمقارنة النصية
    suffix: number;
};

// الترتيب الأبجدي العسكري المخصص
const LETTER_ORDER: Record<string, number> = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ب': 2, 'ج': 3, 'د': 4, 'ه': 5, 'و': 6, 'ز': 7,
    'ح': 8, 'ط': 9, 'ي': 10, 'ى': 10, 'ك': 11, 'ل': 12, 'م': 13, 'ن': 14, 'س': 15,
    'ع': 16, 'ف': 17, 'ص': 18, 'ق': 19, 'ر': 20, 'ش': 21, 'ت': 22, 'ث': 23, 'خ': 24,
    'ذ': 25, 'ض': 26, 'ظ': 27, 'غ': 28
};

/**
 * دالة لتحويل الحروف إلى أوزان رقمية للمقارنة
 * لضمان أن 'أأ' تسبق 'أب' وأن الترتيب أبجدي لكل حرف
 */
function getLettersWeight(letters: string): number[] {
    return letters.split('').map(char => {
        // إذا كان حرفاً إنجليزياً
        if (/[A-Za-z]/.test(char)) {
            return char.toLowerCase().charCodeAt(0);
        }
        // إذا كان حرفاً عربياً من الجدول المخصص
        return LETTER_ORDER[char] || 999;
    });
}

/**
 * تحليل رقم الأقدمية بناءً على الصيغة:
 * رقم (إلزامي) + حروف (اختياري) + رقم لاحق (اختياري فقط في حال وجود حروف)
 */
export function parseSeniority(value?: string | null): ParsedSeniority {
    const text = String(value || "").trim();
    // Regex: رقم أساسي + (حروف + رقم لاحق اختياري)
    // يدعم: 1234 أو 1234أ أو 1234أب1
    const match = text.match(/^(\d+)(?:([A-Za-z\u0600-\u06FF]+)(\d+)?)?$/);

    if (!match) {
        return { valid: false, base: Number.MAX_SAFE_INTEGER, letters: "", suffix: Number.MAX_SAFE_INTEGER };
    }

    return {
        valid: true,
        base: Number(match[1]),
        letters: match[2] || "",
        suffix: match[3] ? Number(match[3]) : 0
    };
}

export function compareSeniority(a?: string | null, b?: string | null): number {
    const pa = parseSeniority(a);
    const pb = parseSeniority(b);

    // 1. التعامل مع البيانات غير الصالحة
    if (pa.valid !== pb.valid) return pa.valid ? -1 : 1;

    // 2. مقارنة الرقم الأساسي (Base)
    if (pa.base !== pb.base) return pa.base - pb.base;

    // 3. مقارنة الحروف (أبجدياً حرفاً بحرف)
    if (pa.letters !== pb.letters) {
        const weightA = getLettersWeight(pa.letters);
        const weightB = getLettersWeight(pb.letters);
        
        const maxLen = Math.max(weightA.length, weightB.length);
        for (let i = 0; i < maxLen; i++) {
            const wA = weightA[i] || 0; // الحرف الفارغ يسبق الحرف الموجود (مثل 'أ' تسبق 'أأ')
            const wB = weightB[i] || 0;
            if (wA !== wB) return wA - wB;
        }
    }

    // 4. مقارنة اللاحقة (Suffix)
    return pa.suffix - pb.suffix;
}
