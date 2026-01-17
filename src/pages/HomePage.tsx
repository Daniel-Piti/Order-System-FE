import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <img 
              src="/logo.png" 
              alt="אורדרית - מערכת ניהול הזמנות" 
              className="h-40 w-auto rounded-3xl shadow-2xl shadow-purple-500/20"
            />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">מערכת ניהול הזמנות</h1>
          <p className="text-xl text-gray-600 mb-2">ניהול עסק, לקוחות, מוצרים והזמנות</p>
        </div>

        {/* Action Cards */}
        <div className="glass-card rounded-3xl p-8 mb-8 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Manager Login Card */}
            <Link
              to="/login/manager"
              className="text-center p-8 rounded-3xl border border-purple-200/50 bg-gradient-to-br from-white via-purple-50/30 to-white backdrop-blur-sm hover:from-purple-50/50 hover:via-purple-100/40 hover:to-purple-50/50 hover:border-purple-300/70 shadow-xl shadow-purple-200/40 hover:shadow-2xl hover:shadow-purple-300/50 hover:scale-[1.02] transition-all duration-300 focus-visible:outline-3 focus-visible:outline-purple-600 focus-visible:outline-offset-2"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 mb-5 shadow-lg shadow-purple-500/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">פורטל מנהל</h2>
              <p className="text-gray-600">התחבר לניהול העסק שלך</p>
            </Link>

            {/* Agent Login Card */}
            <Link
              to="/login/agent"
              className="text-center p-8 rounded-3xl border border-blue-200/50 bg-gradient-to-br from-white via-blue-50/30 to-white backdrop-blur-sm hover:from-blue-50/50 hover:via-blue-100/40 hover:to-blue-50/50 hover:border-blue-300/70 shadow-xl shadow-blue-200/40 hover:shadow-2xl hover:shadow-blue-300/50 hover:scale-[1.02] transition-all duration-300 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 mb-5 shadow-lg shadow-blue-500/30">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">פורטל סוכן</h2>
              <p className="text-gray-600">התחבר לחשבון הסוכן</p>
            </Link>
          </div>
        </div>

        {/* Dashboard Showcase Section */}
        <div className="mt-12 mb-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-800 mb-3">כל מה שצריך לניהול העסק שלך</h2>
            <p className="text-xl text-gray-600">פתרון מקיף ומקצועי במקום אחד</p>
          </div>
          <div className="grid grid-cols-1 gap-10">
            {/* Dashboard/Profile Showcase */}
            <div className="glass-card rounded-3xl p-8 hover:scale-[1.02] transition-transform duration-200">
              <div className="mb-6 rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src="/dashboard.png" 
                  alt="לוח בקרה - ניהול פרופיל ומידע אישי" 
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-3 text-center">לוח בקרה מלא</h3>
              <p className="text-lg text-gray-600 text-center mb-6">נהל את כל היבטי העסק שלך ממקום אחד - כל הכלים הנדרשים לניהול מקצועי</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base text-gray-700 max-w-4xl mx-auto">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>פרופיל מנהל</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>פרופיל עסק</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>הזמנות</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>מידע עסקי</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>סוכנים</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>לקוחות</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>מוצרים</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>מחירים מיוחדים</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>קטגוריות</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>מותגים</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                  <span>סניפים</span>
                </div>
              </div>
            </div>

            {/* Orders Showcase */}
            <div className="glass-card rounded-3xl p-8 hover:scale-[1.02] transition-transform duration-200">
              <div className="mb-6 rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src="/orders.png" 
                  alt="ניהול הזמנות - יצירה, עריכה ומעקב" 
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-3 text-center">ניהול הזמנות</h3>
              <p className="text-lg text-gray-600 text-center mb-6">צור הזמנות חדשות, עקוב אחר סטטוסים, שתף קישורים עם לקוחות וצור חשבוניות</p>
              <div className="space-y-3 text-base text-gray-700 max-w-2xl mx-auto">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>יצירת הזמנות חדשות וניהול הזמנות קיימות</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>מעקב אחר סטטוסים - ריק, הוזמן, הושלם, בוטל</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>שיתוף קישורים עם לקוחות להשלמת הזמנות</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <span>יצירת חשבוניות והנחות מותאמות אישית</span>
                </div>
              </div>
            </div>

            {/* Products Showcase */}
            <div className="glass-card rounded-3xl p-8 hover:scale-[1.02] transition-transform duration-200">
              <div className="mb-6 rounded-2xl overflow-hidden shadow-xl">
                <img 
                  src="/products.png" 
                  alt="ניהול מוצרים - קטלוג מלא עם תמונות ומחירים" 
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-3xl font-bold text-gray-800 mb-3 text-center">קטלוג מוצרים</h3>
              <p className="text-lg text-gray-600 text-center mb-6">נהל את הקטלוג שלך, הוסף מוצרים חדשים, עדכן מחירים ומיין לפי קטגוריות</p>
              <div className="space-y-3 text-base text-gray-700 max-w-2xl mx-auto">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 mt-2 flex-shrink-0"></div>
                  <span>ניהול מוצרים - הוספה, עריכה ומחיקה</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 mt-2 flex-shrink-0"></div>
                  <span>קטגוריות ומותגים - ארגון מוצרים בצורה מסודרת</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 mt-2 flex-shrink-0"></div>
                  <span>מחירים מיוחדים - הנחות ללקוחות וסוכנים</span>
                </div>
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-500 mt-2 flex-shrink-0"></div>
                  <span>תמונות מוצרים - ניהול גלריית תמונות לכל מוצר</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Contact Section - Smaller */}
        <div className="glass-card rounded-3xl p-6 mt-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 mb-3 shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">צור קשר</h2>
            <p className="text-gray-600 text-sm mb-3">נשמח לעזור לך בכל שאלה</p>
            <a
              href="tel:0505566979"
              className="inline-flex items-center justify-center space-x-2 space-x-reverse glass-button px-5 py-2.5 rounded-xl font-semibold text-gray-800 hover:shadow-purple-200 transition-all duration-200 focus-visible:outline-3 focus-visible:outline-blue-600 focus-visible:outline-offset-2 text-sm"
              aria-label="התקשר למספר 050-5566979"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span>050-5566979</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
