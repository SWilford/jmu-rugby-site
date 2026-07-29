# JMU Men's Rugby Website Legal and Launch Readiness Research

**Research date:** July 27, 2026
**Status:** Research and proposed work only — no policies or site changes have been implemented
**Production site reviewed:** `https://www.jmumensrugbyclub.com`

> This document is operational research, not legal advice. Final decisions—especially the site's legal operator, fundraising method, trademark permission, participant releases, and privacy obligations—should be confirmed with JMU UREC/Student Life, the JMU Foundation or University Advancement where applicable, and qualified counsel if the club operates independently or enters commercial arrangements.

## Executive summary

The site should not publish generic boilerplate and call the legal work finished. The correct policies depend on several facts that are not established in the repository:

- Who legally operates the domain and website
- Whether it is treated as an official JMU site, a recognized-student-organization site, or an independent club site
- Who owns the bank/payment account receiving donations
- Whether donations are tax deductible
- What permissions exist for JMU names, logos, player profiles, photos, sponsor logos, and match media
- Whether the club receives money, free products, discounts, or affiliate commissions from displayed sponsors/merchants
- Who owns privacy requests, accessibility reports, security reports, and annual review

The most urgent issue is the donation flow. The live site says a named individual's Venmo account is the “best way to donate to us directly.” JMU's Sport Club Manual permits club checking accounts for dues/fundraising and separately identifies JMU Foundation accounts for donations. JMU's development guidance says gifts are tax deductible only when processed through the club's JMU Foundation account. The wording, recipient, tax treatment, accounting, and UREC approval therefore need to be resolved before the donation page is promoted.

The second urgent issue is participant information. The public roster contains names, years, majors, hometowns, height, weight, bios, and headshots. Some fields may be FERPA directory information, but hometowns, biographies, and headshots are not all listed in JMU's published directory categories. Directory-information treatment also does not override a student's nondisclosure request. The safest sustainable process is a written, revocable roster/photo consent and a documented removal/annual refresh workflow.

## What the site currently does

### Public personal information

The site publishes or can publish:

- Player name
- Academic year and major
- Hometown
- Height and weight
- Biography
- Headshot and other team media
- Coach names and biographies
- Club contact information

### Administrative and technical data

- Supabase Auth processes administrator email, password credentials, sessions, and authentication logs.
- Supabase stores public content and administrator authorization records.
- Vercel hosts the site and can process ordinary request/security logs.
- Cloudflare provides DNS, media delivery/R2 storage, and security services for the media hostname.
- GitHub stores source and development/deployment metadata.
- The donation page requests a QR image from `api.qrserver.com`, revealing normal request metadata and the encoded Venmo destination to that provider.

No public contact form, newsletter signup, ecommerce checkout, behavioral advertising, or first-party analytics integration was found. The tested public response did not set a cookie. If those features are added, this analysis must be revisited before launch.

## Required decisions before drafting final policies

| Gate | Decision owner | Why it matters | Required evidence |
|---|---|---|---|
| L-01 | Club officers + JMU UREC/Student Life | Legal identity and official/unofficial status determine policy wording and responsibility | Written designation and approved operator/contact |
| L-02 | UREC + JMU Foundation/Advancement + treasurer | Donation recipient, accounting, solicitation, and tax claims | Approved donation route and exact disclosure |
| L-03 | JMU licensing/brand + UREC | JMU name/logo and merchandise use require permission | Written approval and licensed-vendor records |
| L-04 | Club + UREC/Registrar guidance | Public roster/photos require a consent and nondisclosure process | Signed release/consent and removal workflow |
| L-05 | Club + sponsor/merchant | Sponsor and affiliate relationships affect disclosures and contracts | Written agreements and benefit/compensation inventory |
| L-06 | Club officers | Privacy/accessibility/security request ownership | Role-based addresses and response process |
| L-07 | Club + UREC | Whether minors or under-13 users submit data | Audience statement and collection rule |
| L-08 | Club + platform owners | Retention and deletion periods | Data inventory and approved schedule |

## Detailed legal and policy research

### 1. Operator identity and JMU non-endorsement

JMU describes recognized student organizations as student-led and says recognition does not mean the university supports or approves all of an organization's activities. JMU also states that student organization pages are unofficial websites for which JMU has no editorial responsibility:

- [JMU recognized student organizations](https://www.jmu.edu/osl/sli/manual/student-organization-basics/recognized-student-orgs.shtml)
- [JMU web privacy statement](https://www.jmu.edu/policies/web-privacy-statement.shtml)
- [JMU Sport Clubs](https://www.jmu.edu/recreation/sports/sport-clubs/index.shtml)

#### Proposed site disclosure

Once JMU confirms the classification, publish a conspicuous footer/About disclaimer along these lines, adjusted to approved language:

> JMU Men's Rugby is a student-led recognized sport club. This website is operated by the club and is not an official James Madison University website. Recognition does not constitute university sponsorship or endorsement. [Adjust if UREC directs otherwise.]

The Terms and Privacy Policy must name the actual operator rather than vaguely saying “we.” Include a role-based contact that survives officer turnover.

### 2. Donations, fundraising, and tax deductibility

The current site:

- Links to `https://venmo.com/u/David-Neal-84`
- Names “David Neal” as the recipient
- Says it is the best way to donate to the club directly
- Does not identify the legal recipient, tax status, refund policy, payment record process, or whether a contribution is tax deductible

JMU's current Sport Club Manual says:

- Club dues and fundraising go into club checking accounts monitored by the president and treasurer.
- JMU Foundation accounts are for donations.
- All funds must be placed in the appropriate club checking or Foundation account based on the nature of the funds.
- Clubs may create their own websites, while use of UREC names/logos and certain promotions require approval.

See the [JMU Sport Club Manual](https://www.jmu.edu/recreation/sports/sport-clubs/resources/sport-club-manual.pdf), particularly pages 15–16 and 20.

JMU's development guidance says the JMU Foundation is a 501(c)(3), and donations are tax deductible only when processed through the club's JMU Foundation account. It also distinguishes a gift from sponsorship/advertising given in exchange for benefits: [JMU Sport Club Development Guide](https://www.jmu.edu/recreation/_files/sport-clubs/developmentguide.pdf).

JMU provides a central donation process that allows donors to select a specific sport club, including Men's Rugby: [JMU Sport Club donations](https://www.jmu.edu/recreation/about/give/sport_clubs.shtml).

Virginia generally requires charitable organizations to register before soliciting contributions unless an exemption applies. Exemptions can cover accredited educational institutions/foundations and certain very small volunteer organizations, but the correct exemption depends on the actual solicitor/operator:

- [Virginia charitable solicitation registration, § 57-49](https://law.lis.virginia.gov/vacode/title57/chapter5/section57-49/)
- [Virginia exemptions, § 57-60](https://law.lis.virginia.gov/vacode/title57/chapter5/section57-60/)

#### Required resolution

Before changing or promoting the donation page:

1. Ask the UREC Assistant Director for Sport Clubs and JMU Foundation/Advancement which link/account the website must use.
2. Prefer the official JMU Foundation club-gift route when asking for tax-deductible gifts.
3. If UREC authorizes club-account/Venmo fundraising, identify the legal recipient and clearly state that payments are not tax-deductible charitable gifts unless JMU confirms otherwise.
4. Never issue tax receipts or use “tax deductible” language without Foundation authorization.
5. Document refund/error-payment handling, transaction reconciliation, access controls, monthly reporting, and officer handoff.
6. Separate sponsorship/business payments from charitable gifts.
7. Obtain a Virginia charitable-solicitation determination from JMU or counsel before conducting an independent public campaign.

The payment recipient should be a controlled club or Foundation process, not an unexplained personal account. This is both a trust and continuity requirement even if UREC confirms that a specific account is permitted.

### 3. Terms of Use

A tailored Terms of Use page should cover:

- Identity of the site operator and effective date
- Informational purpose of the site
- JMU recognition/non-endorsement status
- Eligibility and no under-13 account/data-submission rule
- Acceptable use and prohibited interference
- Intellectual-property ownership and permitted personal use
- Accuracy limitations for schedules, scores, rosters, and third-party links
- No guarantee that participation, selection, playing time, travel, or events are available
- Donation/payment terms, only after L-02 is resolved
- Sponsor/merchant independence and material-connection disclosures
- Third-party services and their separate terms
- Disclaimer of warranties to the extent lawful
- Reasonable limitation of liability to the extent lawful
- Indemnity only if counsel approves it for the actual operator
- Governing law/venue only after operator status is confirmed
- Process for policy changes
- Contact and accessibility accommodation route

#### Important boundary

Website Terms do **not** replace JMU UREC participation documents. JMU's current forms page says informed consent and travel agreements must be signed before participation: [JMU Sport Club forms](https://www.jmu.edu/recreation/sports/sport-clubs/resources/forms.shtml). The Join page should direct participants to the official UREC process and should not imply that submitting an online interest form, emailing, or attending casually waives risk.

### 4. Privacy Policy

JMU explicitly encourages unofficial sites to publish their own privacy statements: [JMU web privacy statement](https://www.jmu.edu/policies/web-privacy-statement.shtml).

The policy should accurately describe, in plain language:

1. **Operator and scope** — who controls this site and which services the policy covers.
2. **Data categories** — public roster/profile data; administrator account/session data; content submitted by officers; device/request/security logs.
3. **Sources** — players/coaches, officers, JMU/league sources, and automatic technical collection.
4. **Purposes** — publish club information, operate the admin portal, secure the site, deliver media, and meet legal/UREC obligations.
5. **Public disclosure** — roster, biographies, headshots, and media are visible worldwide and may be copied or indexed.
6. **Processors/services** — Supabase, Vercel, Cloudflare/R2, GitHub, and any retained QR/payment provider.
7. **Third-party links** — Venmo, social networks, league, merchandise, sponsors, and other linked sites have separate policies.
8. **Sale/advertising statement** — state that personal information is not sold or used for cross-context behavioral advertising only if that remains true.
9. **Cookies/local storage** — disclose Supabase admin-session storage and any future analytics/consent technology. Do not add a cookie banner if it is unnecessary; do reassess before adding nonessential analytics or advertising tags.
10. **Retention** — concrete periods or criteria for public profiles, old media, administrator logs, accounts, and backups.
11. **Security** — reasonable safeguards without promising absolute security.
12. **Choices/requests** — how a person requests access, correction, profile removal, photo removal, or consent withdrawal.
13. **Children** — general-audience status and no knowing collection from children under 13.
14. **International visitors** — service location and transfer statement if relevant.
15. **Changes and contact** — effective date, material-change method, role-based email, and response expectations.

#### Virginia privacy law

The Virginia Consumer Data Protection Act applies at high processing thresholds and expressly exempts nonprofit organizations and institutions of higher education. Whether the club itself fits an exemption depends on its actual legal organization, but this small site also appears far below the statutory thresholds. See [Virginia Code § 59.1-576](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-576/).

That likely means the CDPA is not the primary driver here. It does not remove duties arising from FERPA/JMU policy, contract, consent, security, breach notification, or promises made in the site's own Privacy Policy. The policy must be truthful and operationally supportable.

### 5. Student roster data, FERPA, photos, and publicity rights

JMU lists name, major, academic level, participation in officially recognized sports, and height/weight of athletic-team members as directory information. Students can restrict disclosure, and JMU is not required to disclose directory information merely because it may be disclosed:

- [JMU FERPA information for students](https://www.jmu.edu/registrar/ferpa/students.shtml)
- [JMU FERPA information for faculty/staff](https://www.jmu.edu/registrar/ferpa/facultystaff.shtml)

The current public profile can also include hometown, biography, and headshot, which are not all included in that published directory list. A student may also have a nondisclosure flag that must be respected.

Virginia separately provides a civil remedy for using a person's name, portrait, picture, voice, or likeness for advertising or trade without written consent: [Virginia Code § 8.01-40](https://law.lis.virginia.gov/vacode/title8.01/chapter3/article3/section8.01-40/). Whether a particular club profile is “advertising or trade” is fact-specific, but sponsor and merchandise activity makes written permission especially prudent.

#### Proposed consent workflow

Create a JMU-approved, written, revocable roster/media consent that:

- Lists each public field separately
- Covers headshots, match/event photos, video, and social/web reuse
- Identifies the site and public/international nature of publication
- States the purpose and expected term
- Explains that search engines and third parties may retain copies
- Allows optional fields rather than conditioning participation on unnecessary publicity
- Provides a simple withdrawal/removal route
- Confirms no active nondisclosure conflict through the appropriate JMU process
- Records who supplied each asset and when consent was obtained
- Is refreshed each season and purged after the approved retention period

Do not publish injury details, health information, student IDs, personal addresses, personal phone numbers, schedules that create a safety risk, or travel itineraries.

### 6. Photo, video, music, logo, and content rights

Owning a copy of a photograph or appearing in it does not necessarily confer copyright. The photographer generally owns the copyright from creation unless a valid work-made-for-hire or transfer arrangement applies: [U.S. Copyright Office photography guidance](https://www.copyright.gov/engage/photographers/).

For every media asset, record:

- Photographer/creator
- Copyright owner
- Written license or assignment
- People/likeness consent where needed
- Approved uses, channels, duration, and attribution
- Source file and takedown contact

Do not reuse broadcast clips, league graphics, opponent logos, music, photos copied from social media, or sponsor assets without permission or a documented legal basis. Provide a clear copyright complaint/takedown contact. A formal DMCA safe-harbor process is generally most relevant if the site begins accepting user-generated content; obtain counsel before relying on it.

### 7. JMU name, marks, and merchandise

JMU permits recognized organizations to use its name subject to restrictions and states that usage must not imply university sponsorship or endorsement. Logo use must follow brand/licensing requirements:

- [JMU logo and name usage for student organizations](https://www.jmu.edu/osl/sli/manual/university-policies-and-procedures/jmu-logo-name-usage.shtml)
- [JMU logo standards](https://www.jmu.edu/identity/our-style/logo.shtml)
- [JMU licensing](https://www.jmu.edu/spirit/sellers/get-licensed.shtml)

#### Proposed controls

- Obtain written approval for the website's exact wordmarks/logos.
- Keep approval files with the asset inventory.
- Use licensed vendors for merchandise bearing protected JMU marks.
- Do not imply that a sponsor, merchant, or product is endorsed by JMU.
- Review the domain, social handles, favicon, colors, and merchandise links with the responsible JMU office.

### 8. Sponsors, merchandise, endorsements, and affiliate links

The site displays sponsors and links to a merchandise provider. The contract and benefit relationship is not documented in the repository.

FTC guidance says a material connection that could affect how visitors evaluate an endorsement should be clearly disclosed: [FTC endorsement guidance](https://www.ftc.gov/news-events/topics/truth-advertising/advertisement-endorsements).

For each sponsor or merchant, record:

- Whether the club receives cash, free goods, discounts, services, commissions, or reciprocal promotion
- Contract term, approval, logo license, required language, and termination rights
- Who handles tax/accounting obligations
- Whether any link is an affiliate link
- Whether JMU/UREC approved the arrangement

Place a short, clear disclosure near the relevant promotion, not only in Terms. Examples, to be adjusted to the facts:

- “Paid sponsor of JMU Men's Rugby.”
- “The club receives a commission from purchases made through this link.”
- “Equipment provided to the club at no cost.”

Keep claims accurate and supportable. Do not make health, safety, performance, or comparative product claims without substantiation.

### 9. Accessibility

JMU's current guidance says websites for university-sponsored registered student organizations must be accessible and identifies WCAG 2.1 Level AA, with the university's Title II compliance deadline on April 26, 2027:

- [JMU digital accessibility FAQ](https://www.jmu.edu/accessibility/digital-accessibility/title-ii/faqs.shtml)
- [JMU: everyone has a role](https://www.jmu.edu/accessibility/digital-accessibility/title-ii/everyone-has-a-role.shtml)

The U.S. Department of Justice also identifies accessible web content as an ADA priority and points to WCAG as technical guidance: [ADA.gov web accessibility guidance](https://www.ada.gov/resources/web-guidance/).

#### Proposed work

- Target WCAG 2.1 AA at minimum; ask JMU whether its current standard or procurement rules require WCAG 2.2 AA for new work.
- Test keyboard-only operation, focus order/visibility, headings/landmarks, skip navigation, forms/errors, color contrast, reflow/zoom, reduced motion, alternative text, captions/transcripts, link purpose, and screen-reader announcements.
- Test the administrator portal as well as public pages.
- Require meaningful alt text and caption data in the media publishing workflow.
- Publish an Accessibility Statement with standard targeted, known limitations, review date, and a route to request content in an alternative format.
- Establish a response/remediation process; a statement without operational follow-through is insufficient.

### 10. Children and minors

The site appears aimed at college students, alumni, supporters, and opponents, not children under 13. It currently has no public account creation or submission form.

COPPA can apply to child-directed services and to general-audience services that have actual knowledge they are collecting personal data from a child under 13. The FTC notes that a general-audience site does not have to ask every visitor's age, but actual knowledge triggers obligations: [FTC COPPA guidance](https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy).

#### Proposed control

- State that the service is general audience and is not intended to collect personal information from children under 13.
- Do not add public profiles, uploads, forms, analytics, or tracking aimed at children without a fresh review.
- If youth camps or recruitment of minors is added, use a JMU-approved parental consent, safety, and data-minimization workflow before collection.

### 11. Email and communications

The site has no newsletter system now. If commercial or promotional email is introduced, the CAN-SPAM Act requires accurate headers/subjects, a postal address, a clear opt-out, and timely honoring of opt-outs, among other duties: [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business).

Before adding email marketing:

- Obtain and record addresses lawfully.
- Separate operational team communications from marketing.
- Use a role-owned mailing system, not a student's personal bulk-mail account.
- Include required sender identity/address and unsubscribe controls.
- Maintain suppression lists securely and honor opt-outs.
- Execute appropriate terms/data-processing arrangements with the provider.

### 12. Security incidents and Virginia breach notification

Virginia requires notification without unreasonable delay when covered unencrypted personal information is accessed and acquired by an unauthorized person and identity theft or fraud is reasonably likely; incidents involving more than 1,000 people also trigger additional notice obligations: [Virginia Code § 18.2-186.6](https://law.lis.virginia.gov/vacode/title18.2/chapter6/section18.2-186.6/).

The club should not wait for an incident to determine who owns the systems. The security remediation document proposes a runbook. The legal/operational portion should also identify:

- The actual data owner/operator
- JMU escalation contacts
- Provider contacts
- Evidence preservation
- Counsel/notification decision owner
- Affected-person communication process
- Credential revocation and public-content recovery

Do not promise a fixed breach-notice deadline in the Privacy Policy unless the operator can meet it and it is legally correct for every applicable jurisdiction.

### 13. Event, participation, safety, and schedule disclaimers

The Sport Club Manual requires risk-management and incident documentation, and JMU's forms process requires informed consent/travel documentation before participation:

- [JMU Sport Club Manual](https://www.jmu.edu/recreation/sports/sport-clubs/resources/sport-club-manual.pdf)
- [JMU Sport Club forms](https://www.jmu.edu/recreation/sports/sport-clubs/resources/forms.shtml)

The website should:

- Mark schedules, locations, rosters, and results as subject to change.
- Direct participants to official UREC eligibility, consent, travel, and safety processes.
- Avoid publishing emergency or injury details.
- Avoid presenting website content as medical, legal, safety, or eligibility advice.
- Provide cancellation/weather information only from an authorized source.
- Avoid collecting waiver signatures through the site unless JMU expressly approves the system.

### 14. Policy versioning, records, and annual review

For every public policy:

- Show an effective date and last-reviewed date.
- Preserve prior versions.
- Record the approving officer/JMU contact.
- Review at least annually and on officer turnover, provider change, new data collection, new fundraising, new sponsor contract, security incident, or material legal change.
- Ensure actual operations match the text.

## Policies and documents to prepare after approval

### Public website documents

1. Privacy Policy
2. Terms of Use
3. Accessibility Statement
4. Club/JMU non-endorsement disclaimer
5. Donation/fundraising disclosure and payment terms
6. Sponsor/affiliate disclosures near relevant content
7. Copyright/takedown notice and contact
8. Schedule/participation disclaimer

### Internal governance documents

1. Roster and media consent/release approved by JMU
2. Media copyright/license register
3. Sponsor/merchant agreement and disclosure register
4. Donation-account authorization and reconciliation procedure
5. Data inventory and retention schedule
6. Privacy/accessibility request procedure
7. Security and breach-response runbook
8. Administrator/officer onboarding and offboarding checklist
9. Annual compliance review checklist
10. Vendor/provider inventory with account owners and agreements

## Recommended policy placement

Every page footer should link to:

- Privacy
- Terms
- Accessibility
- Contact

The footer/About area should also show the approved JMU non-endorsement statement. Donation disclosures must appear on the donation page before the payment action. Sponsor/affiliate disclosures must appear close to the sponsor or commerce link. Join/participation notices should appear near calls to attend or register.

## Launch-readiness work beyond legal text

Successful launch requires the policies to match working processes:

### Trust and content

- Resolve the donation recipient and replace ambiguous claims.
- Verify all schedule, contact, league, coach, and roster facts.
- Obtain consent/licenses before publishing profiles and media.
- Create a fast correction/removal route.
- Assign one current officer and one backup to content ownership.

### Accessibility and quality

- Complete a manual WCAG review plus automated checks.
- Test on keyboard, screen reader, 200–400% zoom, reduced motion, mobile, and slow networks.
- Add a real 404 experience and correct status strategy.
- Review image sizing, responsive behavior, and the current >500 kB JavaScript chunk.

### Search and sharing

- Verify page titles, descriptions, canonical URL, sitemap, robots rules, social preview image, favicon, and structured data.
- Ensure old domains redirect consistently to the canonical HTTPS `www` domain.
- Remove or noindex obsolete preview/duplicate URLs; Vercel preview protection already helps.

### Reliability and ownership

- Document domain, DNS, Vercel, Cloudflare, Supabase, GitHub, and payment-account owners.
- Use role-based accounts/addresses where possible.
- Enable billing, expiry, deployment, security, and uptime alerts.
- Create backups/export procedures and test restoration.
- Establish an officer-transition checklist so accounts and policies do not depend on one student.

### Measurement

- Define success measures before adding analytics: donation conversions, join inquiries, schedule use, and accessibility issues.
- Prefer privacy-respecting aggregate measurement.
- Conduct a fresh privacy/cookie review before installing any analytics, advertising pixel, session replay, or marketing tag.

## Proposed implementation order

No item below is approved yet.

### Gate 1 — Institutional and financial decisions

- Confirm operator/status with JMU.
- Confirm name/logo/domain approval.
- Confirm the exact donation route, recipient, accounting, and tax language.
- Inventory sponsor/merchant relationships.

### Gate 2 — People and content rights

- Establish roster/media consent and FERPA nondisclosure check.
- Build copyright/logo/sponsor permission records.
- Identify role-based legal, privacy, accessibility, and security contacts.

### Gate 3 — Draft and review

- Draft the public policies using the confirmed facts.
- Draft the internal procedures/releases.
- Review with UREC/Student Life/Foundation and counsel as appropriate.

### Gate 4 — Implement and verify

- Add approved pages, disclosures, and consent-aware content processes.
- Complete accessibility and functional testing.
- Verify policies against live provider behavior and data flows.

### Gate 5 — Launch and maintain

- Publish approved versions with effective dates.
- Announce material changes where appropriate.
- Review annually and at every officer/provider/feature change.

## Owner approval checklist

- [ ] Confirm whether the website is official, unofficial recognized-organization, or independently operated
- [ ] Name the legal/operator contact and role-based email
- [ ] Obtain JMU name/logo/domain approval
- [ ] Approve the official donation route and exact tax/non-tax disclosure
- [ ] Confirm Virginia solicitation registration/exemption handling
- [ ] Approve roster/media consent and removal workflow
- [ ] Inventory sponsor, merchandise, and affiliate benefits
- [ ] Approve privacy data inventory and retention periods
- [ ] Approve accessibility standard and response owner
- [ ] Approve children/minor collection rule
- [ ] Approve public policy outlines and internal governance documents
- [ ] Identify JMU/Foundation/counsel reviewers

## Decision

**Awaiting owner approval and institutional answers.** No legal page, disclaimer, donation destination, roster entry, media asset, provider, account, or production configuration has been changed as a result of this research.
