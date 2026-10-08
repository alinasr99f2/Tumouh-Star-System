function Header() {
  return (
    <header className="main-header">

      <div className="header-company">
        <img
          src="/aqar-smart-logo.png"
          alt="عقاري سمارت"
          className="company-logo"
        />

        <div className="company-info">
          <h1>عقاري سمارت لإدارة العقارات</h1>
          <p>نظام ذكي لإدارة العقارات والاستثمارات</p>
        </div>
      </div>

      <div className="header-project">
        <span>المشروع الحالي</span>
        <strong>مشروع فلل تبوك</strong>
      </div>

      <div className="header-update">
        <span>آخر تحديث</span>
        <strong>27 يوليو 2026</strong>
      </div>

    </header>
  );
}

export default Header;