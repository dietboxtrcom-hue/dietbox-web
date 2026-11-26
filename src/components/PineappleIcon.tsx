// src/components/PineappleIcon.tsx
interface PineappleIconProps {
  className?: string
  variant?: 'brand' | 'dark'
}

export default function PineappleIcon({
  className = 'w-4 h-4',
  variant = 'brand',
}: PineappleIconProps) {
  const leafColor = variant === 'dark' ? '#0d1f18' : '#51a885'
  const bodyFill = variant === 'dark' ? '#0d1f18' : '#eab130'
  const lineStroke = variant === 'dark' ? '#eab130' : '#92400e'

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${className} shrink-0`}
      aria-hidden="true"
    >
      {/* Ananas Yaprakları (Taç) */}
      <path
        d="M12 2L10.3 6.8L7.2 4.5L8.6 8.3H15.4L16.8 4.5L13.7 6.8L12 2Z"
        fill={leafColor}
      />
      {/* Ananas Gövdesi */}
      <rect
        x="6.5"
        y="8.2"
        width="11"
        height="13.5"
        rx="5.5"
        fill={bodyFill}
      />
      {/* Çapraz Ananas Dokusu */}
      <path
        d="M8.5 11.2L15.5 18.2M15.5 11.2L8.5 18.2M12 9.5L16.2 13.7M7.8 15.7L12 19.9"
        stroke={lineStroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  )
}