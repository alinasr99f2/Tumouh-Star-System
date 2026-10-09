import { supabase } from "../../utils/supabase";

export type ActivityAction =
  | "login"
  | "logout"
  | "add"
  | "edit"
  | "delete"
  | "view"
  | "upload"
  | "permission";

interface LogActivityOptions {
  action: ActivityAction;
  section: string;
  details: string;
}

/**
 * يسجل نشاط المستخدم الحالي في activity_logs.
 * فشل التسجيل لا يوقف العملية الأساسية في البرنامج.
 */
export async function logActivity({
  action,
  section,
  details,
}: LogActivityOptions): Promise<void> {
  const prefix = "[ActivityLog]";

  try {
    // استخدم جلسة Supabase الحالية حتى يكون user_id مرتبطًا بهوية المصادقة.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(`${prefix} تعذر قراءة جلسة المستخدم`, {
        message: sessionError.message,
        name: sessionError.name,
      });
      return;
    }

    const authUser = session?.user;

    if (!authUser?.id) {
      console.warn(`${prefix} لم يتم التسجيل: لا توجد جلسة Supabase نشطة.`);
      return;
    }

    // الاسم والدور معلومات عرض فقط؛ لا نعتمد عليهما في تحديد هوية صاحب السجل.
    let userName = authUser.email || "مستخدم";
    let userRole = "موظف";

    if (authUser.email) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("name, role")
        .eq("email", authUser.email)
        .maybeSingle();

      if (profileError) {
        console.warn(`${prefix} تعذر جلب اسم المستخدم ودوره؛ سيتم استخدام القيم الافتراضية`, {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        });
      } else if (profile) {
        userName = profile.name || userName;
        userRole = profile.role || userRole;
      }
    }

    const payload = {
      // يجب أن يطابق هذا المعرّف auth.uid() في سياسة RLS.
      user_id: authUser.id,
      user_name: userName,
      user_role: userRole,
      action_type: action,
      section,
      details,
      ip_address: null,
    };

    console.info(`${prefix} محاولة تسجيل نشاط`, {
      action_type: action,
      section,
      user_id: authUser.id,
    });

    // لا نستخدم .select() هنا؛ لا يحتاج التسجيل إلى قراءة الصف الذي أُضيف.
    const { error: insertError } = await supabase
      .from("activity_logs")
      .insert(payload);

    if (insertError) {
      console.error(`${prefix} فشل INSERT في activity_logs`, {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        user_id: authUser.id,
        action_type: action,
        section,
      });
      return;
    }

    console.info(`${prefix} تم إرسال سجل النشاط بنجاح`, {
      user_id: authUser.id,
      action_type: action,
      section,
    });
  } catch (error) {
    console.error(`${prefix} حدث استثناء أثناء تسجيل النشاط`, {
      message: error instanceof Error ? error.message : String(error),
      error,
      action,
      section,
    });
  }
}
