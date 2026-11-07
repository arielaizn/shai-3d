import * as React from "react";

import { Container } from "@/components/home/Band";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";
import { WhatsAppGlyph, WhatsAppLink } from "@/components/layout/WhatsAppLink";
import { PRODUCT } from "@/content/products";

/**
 * `/products/[slug]` with no such product, doc 03 §5.4 and 09c §5.5.
 *
 * It says why, in Shai's voice: sometimes he takes a model down to improve it. A 404
 * on a catalogue is usually a link that was shared and then outlived the object, so
 * the page keeps both exits open, the catalogue and a message about the thing the
 * visitor came for. Nothing here apologises and nothing blames the address.
 *
 * The route returns a real HTTP 404, so no robots directive is needed.
 */

export default function ProductNotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="[min-inline-size:0]">
      <section className="[overflow-x:clip] pb-20 pt-16 md:pb-28 md:pt-24 [min-inline-size:0]">
        <Container>
          <EmptyState
            title={PRODUCT.notFound.title}
            body={PRODUCT.notFound.body}
            tone="onRaised"
            actions={
              <>
                <LinkButton href={PRODUCT.notFound.primaryHref} variant="accent" size="lg">
                  {PRODUCT.notFound.primaryCta}
                </LinkButton>

                <WhatsAppLink
                  config={{ kind: "generic" }}
                  source="product_question"
                  variant="ghost"
                  size="lg"
                  iconStart={<WhatsAppGlyph />}
                >
                  {PRODUCT.notFound.secondaryCta}
                </WhatsAppLink>
              </>
            }
          />
        </Container>
      </section>
    </main>
  );
}
