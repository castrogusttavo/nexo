const CERTS = ['gdpr', 'iso', 'soc2'] as const

export function CardCertifications() {
  return (
    <div className='w-full border border-border flex justify-between items-center p-6 py-10 pb-20'>
      <div className='flex flex-col gap-1.5'>
        <h4 className='font-normal text-4xl'>
          O Nexo é construído seguindo <br />
          padrões reconhecidos
        </h4>
        <p>
          de segurança e privacidade — GDPR, ISO 27001 e SOC 2 — como referência
          de boas práticas em toda a plataforma.
        </p>
      </div>
      <div className='flex items-center'>
        {CERTS.map((cert: 'gdpr' | 'iso' | 'soc2') => (
          <div
            key={cert}
            className='p-4 lg:p-8 flex items-center justify-center'
          >
            <span
              role='img'
              aria-label={cert.toUpperCase()}
              className='size-25 bg-muted-foreground transition-colors hover:bg-primary'
              style={{
                maskImage: `url(/certification/${cert}.svg)`,
                WebkitMaskImage: `url(/certification/${cert}.svg)`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
