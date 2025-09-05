import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PasswordResetEmailProps {
  token: string
  redirect_to: string
}

export const PasswordResetEmail = ({
  token,
  redirect_to,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Réinitialisation de votre mot de passe</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Réinitialisation de votre mot de passe</Heading>
        
        <Text style={text}>Bonjour,</Text>
        
        <Text style={text}>
          Vous avez demandé la réinitialisation de votre mot de passe.
        </Text>

        <Button
          href={`${redirect_to}?token=${token}`}
          style={button}
        >
          Réinitialiser mon mot de passe
        </Button>
        
        <Text style={text}>
          Ou copiez ce code de réinitialisation :
        </Text>
        
        <div style={codeContainer}>
          <code style={code}>{token}</code>
        </div>
        
        <Text style={smallText}>
          Ce lien et ce code sont valables pendant 60 minutes.
        </Text>
        
        <Text style={smallText}>
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </Text>
        
        <Text style={footer}>
          Cordialement,<br />L'équipe Tiro
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PasswordResetEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const smallText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 24px',
  margin: '24px 0',
}

const codeContainer = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '24px 0',
}

const code = {
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '4px',
  color: '#007ee6',
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
}

const footer = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  marginTop: '32px',
}