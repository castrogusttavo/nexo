interface PromotionHeaderProps {
  isTrial?: boolean
}

export function PromotionHeader({ isTrial }: PromotionHeaderProps) {
  return <div>{isTrial && <div>Trial</div>}</div>
}
