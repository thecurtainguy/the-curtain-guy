-- Bilingual customer-facing quote and invoice wording.
-- Preserve sent, viewed, accepted, and customized documents.
-- Project: xszhnecwhjcywhqjzfit only.

insert into public.document_texts (slug, body, updated_by)
values
  (
    'quote.terms',
    $en$This proposal is issued by 9395-2521 Québec Inc., operating as The Curtain Guy, and describes the rental items and services proposed for the event identified above.
By accepting this proposal, the client confirms approval of the event details, scope, pricing, payment schedule, and these terms. Acceptance does not reserve inventory, crew, or the event date until The Curtain Guy confirms the booking in writing and receives any required deposit.
This proposal is valid until the date shown. Acceptance after that date requires written reconfirmation of pricing, inventory, and crew availability.
Pricing is based on the information currently available. Venue measurements, access restrictions, schedule or quantity changes, client-requested changes, or other site conditions may require a revised proposal. Material changes will be documented for client approval.
All amounts are in the currency shown. The proposal total includes only the taxes expressly displayed. Any deposit and remaining balance are payable according to the payment schedule shown on this proposal or the related invoice.
The client must provide accurate venue information, obtain required approvals, and provide suitable access and sufficient installation and teardown windows. The client must promptly disclose venue rules or other conditions affecting the work.
Delivery, installation, and teardown will be performed according to the agreed schedule. Delays, additional visits, or additional labour caused by unavailable access, an unprepared venue, or undisclosed restrictions may result in additional charges approved or confirmed in writing.
If the client requests cancellation or rescheduling, The Curtain Guy will confirm any refund, credit, or additional amount in writing. To the extent permitted by law, the client remains responsible for work already performed, specially ordered items, and non-cancellable third-party costs. A replacement date is subject to availability and revised pricing.
Renderings, Studio designs, photographs, samples, and concept images are planning aids. Final appearance may vary because of venue dimensions, lighting, fabric characteristics, available inventory, and installation conditions.
All rental items remain the property of The Curtain Guy. The client must not move, alter, remove, or permit unauthorized handling of installed items and must ensure they remain available for teardown at the agreed time.
The client is responsible for loss of or damage to rental items caused by the client, guests, vendors, or venue personnel, excluding ordinary wear and damage caused by The Curtain Guy. Reasonable repair, replacement, and related labour costs may be invoiced.
Neither party will be considered in default for delays caused by circumstances outside its reasonable control. The parties will cooperate in good faith regarding rescheduling, while completed work and non-recoverable commitments remain payable to the extent permitted by law.
This proposal and its accepted revisions form the agreement between the parties for the quoted work. It is governed by the laws of Québec and the applicable laws of Canada, subject to any mandatory consumer-protection rights.$en$,
    null
  ),
  (
    'quote.terms.fr',
    $fr$La présente soumission est émise par 9395-2521 Québec Inc., faisant affaire sous le nom The Curtain Guy, et décrit les articles loués et les services proposés pour l’événement indiqué ci-dessus.
En acceptant cette soumission, le client confirme son approbation des renseignements sur l’événement, de la portée des travaux, des prix, du calendrier de paiement et des présentes conditions. L’acceptation ne réserve ni l’inventaire, ni l’équipe, ni la date de l’événement avant la confirmation écrite de la réservation par The Curtain Guy et la réception de tout dépôt exigé.
Cette soumission est valide jusqu’à la date indiquée. Toute acceptation après cette date exige une nouvelle confirmation écrite des prix et de la disponibilité de l’inventaire et de l’équipe.
Les prix sont fondés sur les renseignements actuellement disponibles. Les mesures du lieu, les contraintes d’accès, les changements d’horaire ou de quantité, les modifications demandées par le client ou toute autre condition sur place peuvent nécessiter une soumission révisée. Toute modification importante sera documentée aux fins d’approbation par le client.
Tous les montants sont dans la devise indiquée. Le total de la soumission comprend uniquement les taxes expressément affichées. Le dépôt et le solde sont payables selon le calendrier de paiement indiqué dans cette soumission ou dans la facture connexe.
Le client doit fournir des renseignements exacts sur le lieu, obtenir les autorisations requises et assurer un accès convenable ainsi que des plages suffisantes pour l’installation et le démontage. Il doit communiquer sans délai toute règle du lieu ou contrainte touchant les travaux.
La livraison, l’installation et le démontage seront effectués selon l’horaire convenu. Les retards, visites supplémentaires ou heures de travail additionnelles attribuables à un accès indisponible, à un lieu non prêt ou à des contraintes non divulguées peuvent entraîner des frais supplémentaires approuvés ou confirmés par écrit.
Si le client demande une annulation ou un report, The Curtain Guy confirmera par écrit tout remboursement, crédit ou montant supplémentaire. Dans la mesure permise par la loi, le client demeure responsable des travaux déjà effectués, des articles commandés spécialement et des frais de tiers non annulables. Toute nouvelle date est assujettie à la disponibilité et à une révision possible des prix.
Les rendus, dessins Studio, photographies, échantillons et images conceptuelles servent à la planification. L’apparence finale peut varier en raison des dimensions du lieu, de l’éclairage, des caractéristiques des tissus, de l’inventaire disponible et des conditions d’installation.
Tous les articles loués demeurent la propriété de The Curtain Guy. Le client ne doit pas déplacer, modifier ou retirer les installations ni permettre leur manipulation non autorisée, et doit s’assurer qu’elles demeurent accessibles pour le démontage à l’heure convenue.
Le client est responsable de la perte ou des dommages aux articles loués causés par lui-même, ses invités, ses fournisseurs ou le personnel du lieu, à l’exception de l’usure normale et des dommages causés par The Curtain Guy. Les coûts raisonnables de réparation, de remplacement et de main-d’œuvre connexe peuvent être facturés.
Aucune partie ne sera considérée en défaut pour un retard causé par des circonstances indépendantes de sa volonté raisonnable. Les parties collaboreront de bonne foi à tout report, tandis que les travaux exécutés et les engagements non récupérables demeureront payables dans la mesure permise par la loi.
La présente soumission et ses révisions acceptées constituent l’entente entre les parties pour les travaux qui y sont décrits. Elles sont régies par les lois du Québec et les lois applicables du Canada, sous réserve de tout droit impératif en matière de protection du consommateur.$fr$,
    null
  ),
  (
    'quote.pdf_footer',
    'Planning proposal · Booking is secured only after written confirmation and receipt of any required deposit.',
    null
  ),
  (
    'quote.pdf_footer.fr',
    'Proposition de planification · La réservation est garantie uniquement après confirmation écrite et réception de tout dépôt exigé.',
    null
  ),
  (
    'quote.email_note',
    'Please review the scope, event schedule, payment milestones, and Terms & Conditions before accepting. Inventory, crew, and the event date remain subject to written confirmation and receipt of any required deposit. No payment is collected on the proposal page.',
    null
  ),
  (
    'quote.email_note.fr',
    'Veuillez vérifier la portée des travaux, l’horaire de l’événement, les étapes de paiement et les conditions générales avant d’accepter. L’inventaire, l’équipe et la date de l’événement demeurent assujettis à une confirmation écrite et à la réception de tout dépôt exigé. Aucun paiement n’est perçu sur la page de la soumission.',
    null
  )
on conflict (slug) do update
set body = excluded.body,
    updated_by = excluded.updated_by;

update public.business_settings
set invoice_terms = $en$This invoice is issued under the accepted proposal for the event and should be read together with that proposal and its approved revisions.
The event date, inventory, and crew are secured only after written booking confirmation and receipt of the required deposit.
The deposit is applied to the invoice total. The remaining balance is payable by the due date shown on this invoice.
Please include the invoice number with every payment. Payment is considered received once the funds have been successfully processed or cleared.
Cancellation, rescheduling, scope changes, additional labour, and damage charges are governed by the accepted proposal and any subsequent written approvals.
Rental items remain the property of The Curtain Guy and must remain accessible and available for teardown at the agreed time.
Please report questions or payment discrepancies promptly to info@thecurtainguy.com or 514-963-3193.$en$,
    invoice_terms_fr = $fr$La présente facture est émise conformément à la soumission acceptée pour l’événement et doit être lue avec cette soumission et ses révisions approuvées.
La date de l’événement, l’inventaire et l’équipe sont réservés uniquement après la confirmation écrite de la réservation et la réception du dépôt exigé.
Le dépôt est appliqué au total de la facture. Le solde est payable au plus tard à la date d’échéance indiquée sur cette facture.
Veuillez indiquer le numéro de facture avec chaque paiement. Le paiement est considéré comme reçu lorsque les fonds ont été traités ou compensés avec succès.
Les annulations, reports, modifications de la portée, heures de travail additionnelles et frais pour dommages sont régis par la soumission acceptée et toute approbation écrite ultérieure.
Les articles loués demeurent la propriété de The Curtain Guy et doivent rester accessibles et disponibles pour le démontage à l’heure convenue.
Veuillez signaler rapidement toute question ou divergence de paiement à info@thecurtainguy.com ou au 514-963-3193.$fr$,
    invoice_footer = 'Thank you for choosing The Curtain Guy.',
    invoice_footer_fr = 'Merci d’avoir choisi The Curtain Guy.',
    payment_page_intro = 'Choose a payment method below and include your invoice number as the payment reference so we can apply the payment correctly.',
    payment_page_intro_fr = 'Choisissez un mode de paiement ci-dessous et indiquez votre numéro de facture comme référence afin que nous puissions appliquer le paiement correctement.'
where id = 1;

update public.quotes
set terms = $en$This proposal is issued by 9395-2521 Québec Inc., operating as The Curtain Guy, and describes the rental items and services proposed for the event identified above.
By accepting this proposal, the client confirms approval of the event details, scope, pricing, payment schedule, and these terms. Acceptance does not reserve inventory, crew, or the event date until The Curtain Guy confirms the booking in writing and receives any required deposit.
This proposal is valid until the date shown. Acceptance after that date requires written reconfirmation of pricing, inventory, and crew availability.
Pricing is based on the information currently available. Venue measurements, access restrictions, schedule or quantity changes, client-requested changes, or other site conditions may require a revised proposal. Material changes will be documented for client approval.
All amounts are in the currency shown. The proposal total includes only the taxes expressly displayed. Any deposit and remaining balance are payable according to the payment schedule shown on this proposal or the related invoice.
The client must provide accurate venue information, obtain required approvals, and provide suitable access and sufficient installation and teardown windows. The client must promptly disclose venue rules or other conditions affecting the work.
Delivery, installation, and teardown will be performed according to the agreed schedule. Delays, additional visits, or additional labour caused by unavailable access, an unprepared venue, or undisclosed restrictions may result in additional charges approved or confirmed in writing.
If the client requests cancellation or rescheduling, The Curtain Guy will confirm any refund, credit, or additional amount in writing. To the extent permitted by law, the client remains responsible for work already performed, specially ordered items, and non-cancellable third-party costs. A replacement date is subject to availability and revised pricing.
Renderings, Studio designs, photographs, samples, and concept images are planning aids. Final appearance may vary because of venue dimensions, lighting, fabric characteristics, available inventory, and installation conditions.
All rental items remain the property of The Curtain Guy. The client must not move, alter, remove, or permit unauthorized handling of installed items and must ensure they remain available for teardown at the agreed time.
The client is responsible for loss of or damage to rental items caused by the client, guests, vendors, or venue personnel, excluding ordinary wear and damage caused by The Curtain Guy. Reasonable repair, replacement, and related labour costs may be invoiced.
Neither party will be considered in default for delays caused by circumstances outside its reasonable control. The parties will cooperate in good faith regarding rescheduling, while completed work and non-recoverable commitments remain payable to the extent permitted by law.
This proposal and its accepted revisions form the agreement between the parties for the quoted work. It is governed by the laws of Québec and the applicable laws of Canada, subject to any mandatory consumer-protection rights.$en$
where status = 'draft'
  and language = 'en'
  and terms in (
    $old6$This document is a planning proposal based on details shared to date; it is not a final invoice or confirmed booking.
Inventory and scheduling are reserved only after The Curtain Guy confirms the booking in writing.
Delivery, installation, and teardown are scheduled around the event timeline and may require agreed venue access windows.
Applicable sales taxes (including GST/QST when shown) are included in the proposal total unless noted otherwise.
A deposit or written booking confirmation may be required before production begins.
The client is responsible for accurate venue details, load-in access, and any venue rules affecting installation.$old6$,
    $old7$This document is a planning proposal based on details shared to date; it is not a final invoice or confirmed booking.
Final pricing may change after venue confirmation, on-site measurements, access constraints, and install/teardown windows are verified.
Inventory and scheduling are reserved only after The Curtain Guy confirms the booking in writing.
Delivery, installation, and teardown are scheduled around the event timeline and may require agreed venue access windows.
Applicable sales taxes (including GST/QST when shown) are included in the proposal total unless noted otherwise.
A deposit or written booking confirmation may be required before production begins.
The client is responsible for accurate venue details, load-in access, and any venue rules affecting installation.$old7$
  );

update public.quotes
set terms = $fr$La présente soumission est émise par 9395-2521 Québec Inc., faisant affaire sous le nom The Curtain Guy, et décrit les articles loués et les services proposés pour l’événement indiqué ci-dessus.
En acceptant cette soumission, le client confirme son approbation des renseignements sur l’événement, de la portée des travaux, des prix, du calendrier de paiement et des présentes conditions. L’acceptation ne réserve ni l’inventaire, ni l’équipe, ni la date de l’événement avant la confirmation écrite de la réservation par The Curtain Guy et la réception de tout dépôt exigé.
Cette soumission est valide jusqu’à la date indiquée. Toute acceptation après cette date exige une nouvelle confirmation écrite des prix et de la disponibilité de l’inventaire et de l’équipe.
Les prix sont fondés sur les renseignements actuellement disponibles. Les mesures du lieu, les contraintes d’accès, les changements d’horaire ou de quantité, les modifications demandées par le client ou toute autre condition sur place peuvent nécessiter une soumission révisée. Toute modification importante sera documentée aux fins d’approbation par le client.
Tous les montants sont dans la devise indiquée. Le total de la soumission comprend uniquement les taxes expressément affichées. Le dépôt et le solde sont payables selon le calendrier de paiement indiqué dans cette soumission ou dans la facture connexe.
Le client doit fournir des renseignements exacts sur le lieu, obtenir les autorisations requises et assurer un accès convenable ainsi que des plages suffisantes pour l’installation et le démontage. Il doit communiquer sans délai toute règle du lieu ou contrainte touchant les travaux.
La livraison, l’installation et le démontage seront effectués selon l’horaire convenu. Les retards, visites supplémentaires ou heures de travail additionnelles attribuables à un accès indisponible, à un lieu non prêt ou à des contraintes non divulguées peuvent entraîner des frais supplémentaires approuvés ou confirmés par écrit.
Si le client demande une annulation ou un report, The Curtain Guy confirmera par écrit tout remboursement, crédit ou montant supplémentaire. Dans la mesure permise par la loi, le client demeure responsable des travaux déjà effectués, des articles commandés spécialement et des frais de tiers non annulables. Toute nouvelle date est assujettie à la disponibilité et à une révision possible des prix.
Les rendus, dessins Studio, photographies, échantillons et images conceptuelles servent à la planification. L’apparence finale peut varier en raison des dimensions du lieu, de l’éclairage, des caractéristiques des tissus, de l’inventaire disponible et des conditions d’installation.
Tous les articles loués demeurent la propriété de The Curtain Guy. Le client ne doit pas déplacer, modifier ou retirer les installations ni permettre leur manipulation non autorisée, et doit s’assurer qu’elles demeurent accessibles pour le démontage à l’heure convenue.
Le client est responsable de la perte ou des dommages aux articles loués causés par lui-même, ses invités, ses fournisseurs ou le personnel du lieu, à l’exception de l’usure normale et des dommages causés par The Curtain Guy. Les coûts raisonnables de réparation, de remplacement et de main-d’œuvre connexe peuvent être facturés.
Aucune partie ne sera considérée en défaut pour un retard causé par des circonstances indépendantes de sa volonté raisonnable. Les parties collaboreront de bonne foi à tout report, tandis que les travaux exécutés et les engagements non récupérables demeureront payables dans la mesure permise par la loi.
La présente soumission et ses révisions acceptées constituent l’entente entre les parties pour les travaux qui y sont décrits. Elles sont régies par les lois du Québec et les lois applicables du Canada, sous réserve de tout droit impératif en matière de protection du consommateur.$fr$
where status = 'draft'
  and language = 'fr'
  and terms = $oldfr$Ce document est une proposition de planification fondée sur les renseignements fournis à ce jour; il ne constitue ni une facture finale ni une réservation confirmée.
Le prix final peut changer après la confirmation du lieu, la prise de mesures sur place, les contraintes d’accès et la vérification des plages d’installation et de démontage.
L’inventaire et l’horaire ne sont réservés qu’après la confirmation écrite de la réservation par The Curtain Guy.
La livraison, l’installation et le démontage sont planifiés selon l’horaire de l’événement et peuvent nécessiter des plages d’accès convenues avec le lieu.
Les taxes de vente applicables (y compris la TPS et la TVQ lorsqu’elles sont indiquées) sont incluses dans le total de la soumission, sauf indication contraire.
Un dépôt ou une confirmation écrite de réservation peut être exigé avant le début de la production.
Le client est responsable de l’exactitude des renseignements sur le lieu, de l’accès au débarquement et de toute règle du lieu touchant l’installation.$oldfr$;
