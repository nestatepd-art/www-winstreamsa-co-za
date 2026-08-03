import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
}
const container = {
  padding: '32px 28px',
  maxWidth: '600px',
  border: '1px solid #e6e8ee',
  borderRadius: '12px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0b1020',
  margin: '0 0 20px',
  letterSpacing: '-0.4px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: '#0e7c86', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0b1020',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '10px',
  padding: '13px 22px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const footer = {
  fontSize: '12px',
  color: '#8a8f9c',
  margin: '30px 0 0',
  borderTop: '1px solid #eef0f4',
  paddingTop: '16px',
}
