import { relations } from "drizzle-orm";
import { cards, cardLabels, labels } from "./schema";

export const cardsRelations = relations(cards, ({ many }) => ({
  cardLabels: many(cardLabels),
}));

export const cardLabelsRelations = relations(cardLabels, ({ one }) => ({
  card: one(cards, {
    fields: [cardLabels.cardId],
    references: [cards.id],
  }),
  label: one(labels, {
    fields: [cardLabels.labelId],
    references: [labels.id],
  }),
}));
