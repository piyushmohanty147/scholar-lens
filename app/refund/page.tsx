import type { Metadata } from "next";
import Legal from "../legal";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "../../lib/site";

export const metadata: Metadata = { title: "Refund and Cancellation Policy | Scholar Lens", description: "Refund and cancellation policy for Scholar Lens paid plans." };

export default function Page() {
  return (
    <Legal title="Refund and Cancellation Policy" updated={LEGAL_UPDATED}>
      <h2>What you buy</h2>
      <p>{SITE_NAME} Pro, when available, is a digital service. A purchase gives you higher usage limits for a fixed period (30 days) from the time of payment. It is a one-time payment and does <strong>not renew automatically</strong>, so there is nothing to cancel. Access is activated online right after payment and nothing is shipped.</p>

      <h2>When we refund</h2>
      <p>Email us within <strong>7 days</strong> of your purchase and we will refund you in full if:</p>
      <ul>
        <li>you were charged more than once for the same purchase;</li>
        <li>your payment succeeded but Pro was not activated and we could not fix it; or</li>
        <li>the service was unavailable or not working for a significant part of your plan period.</li>
      </ul>
      <p>For other reasons, we will consider requests made within 7 days and decide each one fairly. After 7 days, purchases are generally non-refundable.</p>

      <h2>How refunds are paid</h2>
      <p>Approved refunds go back to the original payment method. They usually reach your account within 5 to 10 business days, depending on your bank or card issuer.</p>

      <h2>How to ask</h2>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account email with your order ID or payment ID and the reason. We aim to reply within 2 business days.</p>
    </Legal>
  );
}
