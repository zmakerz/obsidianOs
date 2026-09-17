import type { ApprovalListItem, KpiCard, LoopListItem, Tone } from "@business-os/database";
import { isPostgresConfigured, loadDashboard } from "@/lib/dashboard";
import { reviewApprovalAction } from "./actions";

export const dynamic = "force-dynamic";

const phaseOrder = ["observe", "analyze", "plan", "approve", "execute", "measure", "learn"];
const phaseLabels: Record<string, string> = {
  observe: "관찰", analyze: "분석", plan: "계획", approve: "승인",
  execute: "실행", measure: "측정", learn: "학습",
};

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function toneLabel(tone: Tone): string {
  if (tone === "positive") return "정상";
  if (tone === "warning") return "확인 필요";
  if (tone === "critical") return "위험";
  return "정보";
}

function Kpi({ item }: { item: KpiCard }) {
  return (
    <article className={`kpi-card tone-${item.tone}`}>
      <div className="kpi-top"><span>{item.label}</span><span className="tone-label">{toneLabel(item.tone)}</span></div>
      <div className="kpi-value">{item.value.toLocaleString("ko-KR")}<small>{item.unit}</small></div>
      <p>{item.deltaPercentage == null ? "비교 데이터 없음" : `${item.deltaPercentage >= 0 ? "+" : ""}${item.deltaPercentage}% 이전 기록 대비`}</p>
    </article>
  );
}

function LoopProgress({ loop }: { loop: LoopListItem }) {
  const activeIndex = Math.max(0, phaseOrder.indexOf(loop.phase));
  return (
    <article className="loop-card">
      <div className="loop-head">
        <div><span className="eyebrow">{loop.packId ?? "core"} · cycle {loop.cycle}</span><h3>{loop.name}</h3></div>
        <span className="phase-pill">{phaseLabels[loop.phase] ?? loop.phase}</span>
      </div>
      <div className="phase-track" aria-label={`현재 단계 ${phaseLabels[loop.phase] ?? loop.phase}`}>
        {phaseOrder.map((phase, index) => (
          <span key={phase} className={index <= activeIndex ? "phase complete" : "phase"} title={phaseLabels[phase]} />
        ))}
      </div>
      <div className="loop-meta"><span>{loop.scorecardMetric ?? "성적표 미설정"}</span><strong>{loop.scorecardValue ?? "—"}</strong></div>
    </article>
  );
}

function Approval({ item, mutable }: { item: ApprovalListItem; mutable: boolean }) {
  return (
    <article className="approval-card">
      <div className="approval-main">
        <div><span className={`risk risk-${item.riskLevel}`}>{item.riskLevel}</span><span className="action-type">{item.actionType}</span></div>
        <h3>{item.summary}</h3>
        <p>{item.requestedBy} · {formatTime(item.createdAt)}</p>
      </div>
      <form action={reviewApprovalAction} className="approval-actions">
        <input type="hidden" name="approvalId" value={item.id} />
        <button name="decision" value="rejected" className="button secondary" disabled={!mutable}>반려</button>
        <button name="decision" value="approved" className="button primary" disabled={!mutable}>승인</button>
      </form>
    </article>
  );
}

export default async function ControlTowerPage() {
  const dashboard = await loadDashboard();
  const mutable = isPostgresConfigured();
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand-mark">BO</div>
        <nav aria-label="주요 메뉴">
          <a className="active" href="#overview">Overview</a>
          <a href="#approvals">Approvals <span>{dashboard.approvals.length}</span></a>
          <a href="#loops">Loops</a>
          <a href="#activity">Activity</a>
        </nav>
        <div className="sidebar-foot">
          <span className={`source-dot ${dashboard.dataSource}`} />
          {dashboard.dataSource === "postgres" ? "PostgreSQL" : "Demo mode"}
        </div>
      </aside>

      <section className="content">
        <header className="topbar" id="overview">
          <div><p className="eyebrow">{dashboard.identity.organizationName}</p><h1>{dashboard.identity.workspaceName}</h1></div>
          <div className="date-block"><span>마지막 갱신</span><strong>{formatTime(dashboard.generatedAt)}</strong></div>
        </header>

        {dashboard.dataSource === "demo" && (
          <div className="demo-banner"><strong>Demo mode</strong><span>`DATABASE_URL`을 연결하면 승인과 운영 상태가 PostgreSQL에 기록됩니다.</span></div>
        )}

        <section className="kpi-grid" aria-label="핵심 지표">
          {dashboard.kpis.map((item) => <Kpi key={item.key} item={item} />)}
        </section>

        <section className="dashboard-grid">
          <div className="main-column">
            <section className="panel" id="approvals">
              <div className="panel-head"><div><p className="eyebrow">Human gate</p><h2>승인 대기</h2></div><span className="count">{dashboard.approvals.length}</span></div>
              <div className="stack">
                {dashboard.approvals.length
                  ? dashboard.approvals.map((item) => <Approval key={item.id} item={item} mutable={mutable} />)
                  : <p className="empty">현재 승인 대기 작업이 없습니다.</p>}
              </div>
            </section>

            <section className="panel" id="loops">
              <div className="panel-head"><div><p className="eyebrow">Operating system</p><h2>실행 중인 루프</h2></div><span className="count">{dashboard.loops.length}</span></div>
              <div className="stack">{dashboard.loops.map((loop) => <LoopProgress key={loop.id} loop={loop} />)}</div>
            </section>
          </div>

          <div className="side-column">
            <section className="panel recommendations">
              <div className="panel-head"><div><p className="eyebrow">AI brief</p><h2>추천 행동</h2></div></div>
              <div className="stack">
                {dashboard.recommendations.map((item, index) => (
                  <article className="recommendation" key={item.id}>
                    <span className="recommendation-number">0{index + 1}</span>
                    <div><span className={`risk risk-${item.priority}`}>{item.priority}</span><h3>{item.title}</h3><p>{item.rationale}</p><small>{item.source}</small></div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel" id="activity">
              <div className="panel-head"><div><p className="eyebrow">Audit trail</p><h2>최근 활동</h2></div></div>
              <div className="timeline">
                {dashboard.activities.map((item) => (
                  <article key={item.id} className="timeline-item">
                    <span className={`event-dot ${item.severity}`} />
                    <div><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}<time>{formatTime(item.createdAt)}</time></div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
