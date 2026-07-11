import { brand, brandSocials } from "@/lib/brand";
import { Section, Text, Link } from "react-email";

export const EmailFooter = () => (
  <Section className='bg-[#f4f5f5] p-8'>
    <Text className='text-slate-500 text-[14px] pb-10'>{brand.legalName}</Text>
    <table
      width='100%'
      cellPadding={0}
      cellSpacing={0}
      role='presentation'
      style={{ borderCollapse: 'collapse' }}
    >
      <tbody>
        <tr>
          <td align='right'>
            {brandSocials.map((social) => (
              <Link
                key={social.name}
                href={social.url}
                style={{ display: 'inline-block', paddingLeft: '24px' }}
              >
                <img src={social.icon} width='24' height='24' alt={social.name} />
              </Link>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
)
