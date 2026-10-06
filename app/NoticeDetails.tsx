import { formatIsoDate, noticesFor, type FishingRule, type Language } from "./fishing-data";

const text = {
  en: {
    notice: "DFO notice",
    sent: (date: string) => `issued ${date}`,
    earlier: "earlier year",
    earlierNote: (year: number) =>
      `This notice was issued in ${year}. DFO's page still cites it, so check for a newer notice before relying on these dates this year.`,
    original: "Read the notice on DFO",
  },
  zh: {
    notice: "DFO 通知",
    sent: (date: string) => `${date}发布`,
    earlier: "往年通知",
    earlierNote: (year: number) =>
      `这份通知是 ${year} 年发布的，DFO 页面仍在引用它。今年按这些日期出钓前，请先确认 DFO 是否有更新的通知。`,
    original: "在 DFO 网站查看通知原文",
  },
};

// The order is shown in DFO's English in both languages: it is the legal text.
export default function NoticeDetails({ rule, language }: { rule: FishingRule; language: Language }) {
  const notices = noticesFor(rule);
  if (!notices.length) return null;
  const t = text[language];
  const year = new Date().getFullYear();
  return (
    <div className="notice-list">
      {notices.map((notice) => {
        const sentYear = notice.sent ? Number(notice.sent.slice(0, 4)) : null;
        const earlier = sentYear !== null && sentYear < year;
        return (
          <details className="notice" key={notice.id} data-notice={notice.id}>
            <summary>
              <span>
                {t.notice} {notice.id}
                {notice.sent && ` · ${t.sent(formatIsoDate(notice.sent, language))}`}
              </span>
              {earlier && <span className="notice-earlier">{t.earlier}</span>}
            </summary>
            {earlier && sentYear && <p className="notice-warning">{t.earlierNote(sentYear)}</p>}
            {notice.subject && <p className="notice-subject" lang="en">{notice.subject}</p>}
            {notice.order?.map((line, index) => (
              <p lang="en" key={index}>
                {line}
              </p>
            ))}
            <a href={notice.url} target="_blank" rel="noreferrer">
              {t.original}
            </a>
          </details>
        );
      })}
    </div>
  );
}
