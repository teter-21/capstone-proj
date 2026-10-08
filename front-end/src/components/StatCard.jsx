import { createElement } from "react";
function StatCard({ title, value, icon: Icon, color, tag }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-top">
        <div className="stat-icon">
          {createElement(Icon)}
        </div>
        {tag && <span className="stat-tag">{tag}</span>}
      </div>

      <p className="stat-title">{title}</p>
      <h2 className="stat-value">{value}</h2>
    </div>
  );
}

export default StatCard;
