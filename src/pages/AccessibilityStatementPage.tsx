import { Link } from 'react-router-dom';

export default function AccessibilityStatementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-cyan-50 to-indigo-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">הצהרת נגישות</h1>
            <p className="text-gray-600">
              תאריך עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">מבוא</h2>
            <p className="text-gray-700 leading-relaxed">
              מערכת ניהול ההזמנות מחויבת לספק שירות נגיש ושוויוני לכל המשתמשים, 
              בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות (התשנ"ח-1998) ולחוק התקנות 
              לנגישות השירות (התשע"ג-2013).
            </p>
            <p className="text-gray-700 leading-relaxed">
              האתר עומד בתקן <strong>WCAG 2.2 Level AA</strong> של ארגון ה-W3C, 
              המהווה את התקן הבינלאומי לנגישות אתרים.
            </p>
          </section>

          {/* Accessibility Features */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">תכונות נגישות</h2>
            <p className="text-gray-700 leading-relaxed">
              האתר כולל את התכונות הבאות לשיפור הנגישות:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li>ניווט מקלדת מלא - כל הפונקציונליות נגישה באמצעות מקלדת</li>
              <li>תמיכה בקוראי מסך - תמיכה מלאה ב-NVDA, JAWS, VoiceOver</li>
              <li>קישורי דילוג לתוכן - מאפשרים לדלג ישירות לתוכן הראשי או לניווט</li>
              <li>התאמת גודל גופן - אפשרות להגדיל את הטקסט (קטן, רגיל, גדול, גדול מאוד)</li>
              <li>התאמת ניגודיות - אפשרות להגדיל את הניגודיות בין טקסט לרקע</li>
              <li>התאמת מרווחים - אפשרות להגדיל מרווחים בין אותיות, מילים ואלמנטים</li>
              <li>תמונות עם טקסט חלופי - כל התמונות כוללות תיאור טקסטואלי</li>
              <li>טבלאות נגישות - טבלאות עם כותרות, תיאורים ומבנה נכון</li>
              <li>טפסים נגישים - כל השדות כוללים תוויות, הודעות שגיאה והוראות</li>
              <li>מודלים נגישים - חלונות מודליים עם לכידת מוקד וניווט מקלדת</li>
            </ul>
          </section>

          {/* Standards Compliance */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">תאימות לתקנים</h2>
            <p className="text-gray-700 leading-relaxed">
              האתר עומד בדרישות הבאות:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li><strong>WCAG 2.2 Level AA</strong> - תקן נגישות אתרים בינלאומי</li>
              <li><strong>תקן ישראלי 5568</strong> - הנחיות לנגישות תוכן באינטרנט</li>
              <li><strong>חוק שוויון זכויות לאנשים עם מוגבלות</strong> - התשנ"ח-1998</li>
              <li><strong>תקנות נגישות השירות</strong> - התשע"ג-2013</li>
            </ul>
          </section>

          {/* Known Issues */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">בעיות ידועות</h2>
            <p className="text-gray-700 leading-relaxed">
              נכון לתאריך עדכון זה, לא זוהו בעיות נגישות משמעותיות באתר. 
              במידה ותגלו בעיה, אנא צרו קשר באמצעות הפרטים למטה.
            </p>
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">דיווח על בעיות נגישות</h2>
            <p className="text-gray-700 leading-relaxed">
              אם נתקלתם בבעיית נגישות באתר, או שיש לכם הצעות לשיפור, 
              אנא צרו קשר עמנו:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-gray-700">
                <strong>טלפון:</strong>{' '}
                <a 
                  href="tel:0505566979"
                  className="text-indigo-600 hover:text-indigo-700 underline focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
                >
                  050-5566979
                </a>
              </p>
              <p className="text-sm text-gray-600">
                שעות פעילות: ימים א'-ה' 09:00-17:00
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed">
              נשתדל להגיב לכל פנייה תוך <strong>5 ימי עסקים</strong>.
            </p>
          </section>

          {/* Enforcement Procedure */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">הליך אכיפה</h2>
            <p className="text-gray-700 leading-relaxed">
              במידה שלא קיבלתם תשובה מספקת, ניתן לפנות ל:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li>
                <strong>נציבות שוויון זכויות לאנשים עם מוגבלות</strong>
                <br />
                טלפון: 02-508-2500
                <br />
                אתר: <a 
                  href="https://www.gov.il/he/departments/equality" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 underline focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
                >
                  www.gov.il/he/departments/equality
                </a>
              </li>
            </ul>
          </section>

          {/* Accessibility Widget */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">ווידג'ט נגישות</h2>
            <p className="text-gray-700 leading-relaxed">
              האתר כולל ווידג'ט נגישות המאפשר התאמה אישית של:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li>גודל גופן (קטן, רגיל, גדול, גדול מאוד)</li>
              <li>רמת ניגודיות (רגיל, גבוה)</li>
              <li>מרווחים (רגיל, מוגדל)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              הווידג'ט נמצא בפינה השמאלית התחתונה של המסך. 
              ניתן גם לפתוח אותו באמצעות קיצור המקלדת: <strong>Alt + A</strong> (או <strong>Option + A</strong> ב-Mac).
            </p>
          </section>

          {/* Back Link */}
          <div className="pt-6 border-t border-gray-200">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              חזרה לעמוד הראשי
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

