import { companies, group, type CompanyId } from "../../brand";
import { routes } from "../../lib/routes";
import { Mark } from "./Logo";

/** Thin strip above a company's site that ties it back to the parent group. */
export function GroupBar({ current }: { current: CompanyId }) {
  return (
    <div className="groupbar">
      <div className="groupbar__inner">
        <a href={routes.group} className="groupbar__home">
          <Mark size={14} dot="solid" />
          <span>
            An <strong>{group.name}</strong> company
          </span>
        </a>
        <nav className="groupbar__links" aria-label={`${group.name} companies`}>
          {(Object.keys(companies) as CompanyId[]).map((id) => (
            <a
              key={id}
              href={routes[id]}
              className="groupbar__link"
              aria-current={id === current ? "page" : undefined}
            >
              {companies[id].label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
