import { useConnection } from "../ConnectionContext.jsx";

export default function Header({ title, subtitle, badge = "Online" }) {
  const { online } = useConnection();
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className={"badge-online" + (online ? "" : " off")}><i /> {online ? badge : "Offline"}</span>
    </div>
  );
}
