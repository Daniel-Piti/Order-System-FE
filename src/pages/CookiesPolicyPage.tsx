import { Link } from 'react-router-dom';

export default function CookiesPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-cyan-50 to-indigo-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">מדיניות עוגיות</h1>
            <p className="text-gray-600">
              תאריך עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
            </p>
          </div>

          {/* Introduction */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">מה הן עוגיות?</h2>
            <p className="text-gray-700 leading-relaxed">
              עוגיות (Cookies) הן קבצי טקסט קטנים המאוחסנים במכשיר שלכם (מחשב, טלפון, טאבלט) 
              כאשר אתם מבקרים באתרים. העוגיות מאפשרות לאתר לזכור את ההעדפות שלכם ולשפר את 
              חוויית השימוש.
            </p>
          </section>

          {/* Types of Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">סוגי עוגיות שאנו משתמשים</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">עוגיות הכרחיות</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  עוגיות אלה הכרחיות לפעולת האתר ואי אפשר להפעיל את האתר בלעדיהן. 
                  הן מוגדרות בדרך כלל כתגובה לפעולות שביצעתם, כגון הגדרת העדפות פרטיות, 
                  התחברות או מילוי טפסים.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>מטרה:</strong> שמירת העדפות נגישות, שמירת מצב התחברות, 
                  שמירת עגלת קניות
                </p>
                <p className="text-sm text-gray-600">
                  <strong>תוקף:</strong> עד שנה או עד מחיקה ידנית
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">עוגיות ביצועים</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  עוגיות אלה מאפשרות לנו לספור ביקורים ולזהות מקורות תנועה כדי לשפר את ביצועי האתר. 
                  הן עוזרות לנו לדעת אילו דפים הכי פופולריים ואילו הכי פחות, ולראות איך משתמשים 
                  נעים באתר.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>מטרה:</strong> שיפור ביצועי האתר, הבנת דפוסי שימוש
                </p>
                <p className="text-sm text-gray-600">
                  <strong>תוקף:</strong> עד שנה
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">עוגיות פונקציונליות</h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  עוגיות אלה מאפשרות לאתר לספק פונקציונליות ושירותים משופרים. 
                  אם לא תאפשרו עוגיות אלה, חלק מהשירותים עשויים לא לעבוד.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>מטרה:</strong> שמירת העדפות משתמש, שמירת הגדרות נגישות
                </p>
                <p className="text-sm text-gray-600">
                  <strong>תוקף:</strong> עד שנה
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">איך אנו משתמשים בעוגיות</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li>לשמירת העדפות נגישות (גודל גופן, ניגודיות, מרווחים)</li>
              <li>לשמירת מצב התחברות</li>
              <li>לשמירת עגלת קניות</li>
              <li>לשיפור ביצועי האתר</li>
              <li>להבנת דפוסי שימוש</li>
            </ul>
          </section>

          {/* Managing Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">ניהול עוגיות</h2>
            <p className="text-gray-700 leading-relaxed">
              אתם יכולים לשלוט ולנהל עוגיות בדרכים הבאות:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
              <li>
                <strong>הגדרות דפדפן:</strong> רוב הדפדפנים מאפשרים לכם לשלוט בעוגיות 
                דרך תפריט ההגדרות. תוכלו למחוק עוגיות קיימות או למנוע את קבלתן.
              </li>
              <li>
                <strong>ווידג'ט נגישות:</strong> תוכלו לנהל את העוגיות דרך הווידג'ט 
                הנגישות באתר (פינה שמאלית תחתונה).
              </li>
              <li>
                <strong>מחיקה ידנית:</strong> תוכלו למחוק עוגיות בכל עת דרך הגדרות הדפדפן.
              </li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm">
                <strong>שימו לב:</strong> מחיקת עוגיות עשויה להשפיע על תפקוד האתר. 
                לדוגמה, ייתכן שתצטרכו להתחבר מחדש או שהעדפות הנגישות שלכם יאבדו.
              </p>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">עוגיות של צדדים שלישיים</h2>
            <p className="text-gray-700 leading-relaxed">
              כרגע, האתר שלנו לא משתמש בעוגיות של צדדים שלישיים. במידה ונוסיף שירותים 
              של צדדים שלישיים בעתיד, נעדכן מדיניות זו בהתאם.
            </p>
          </section>

          {/* Updates */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">עדכונים למדיניות</h2>
            <p className="text-gray-700 leading-relaxed">
              אנו עשויים לעדכן מדיניות זו מעת לעת. כל שינוי יפורסם בדף זה עם תאריך 
              העדכון. מומלץ לבדוק דף זה מדי פעם כדי להישאר מעודכנים.
            </p>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">יצירת קשר</h2>
            <p className="text-gray-700 leading-relaxed">
              אם יש לכם שאלות לגבי מדיניות העוגיות שלנו, אנא צרו קשר:
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

