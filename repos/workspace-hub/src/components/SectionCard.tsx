import type { ReactNode } from 'react'

type SectionCardProps = {
  body: string
  children: ReactNode
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
  eyebrow: string
  title: string
}

export function SectionCard({
  body,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  eyebrow,
  title,
}: SectionCardProps) {
  const sectionClassName = ['section-card', collapsible ? 'collapsible' : '', className]
    .filter(Boolean)
    .join(' ')

  if (collapsible) {
    return (
      <section className={sectionClassName}>
        <details className="section-card-toggle" open={defaultOpen}>
          <summary className="section-card-summary">
            <header>
              <p className="eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
              <p>{body}</p>
            </header>
            <span className="section-card-toggle-indicator" aria-hidden="true" />
          </summary>
          <div className="section-card-content">{children}</div>
        </details>
      </section>
    )
  }

  return (
    <section className={sectionClassName}>
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </header>
      {children}
    </section>
  )
}
