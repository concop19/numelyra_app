/**
 * tarotAssets.ts - Quản lý hình ảnh 22 lá bài Tarot Rider-Waite & Lưng bài
 */

export const TAROT_CARD_BACK = require('../../assets/tarot/card-back.png');

export const TAROT_IMAGE_MAP: Record<string, any> = {
  '0-fool': require('../../assets/tarot/cards/00-fool.jpg'),
  '1-magician': require('../../assets/tarot/cards/01-magician.jpg'),
  '2-high-priestess': require('../../assets/tarot/cards/02-high-priestess.jpg'),
  '3-empress': require('../../assets/tarot/cards/03-empress.jpg'),
  '4-emperor': require('../../assets/tarot/cards/04-emperor.jpg'),
  '5-hierophant': require('../../assets/tarot/cards/05-hierophant.jpg'),
  '6-lovers': require('../../assets/tarot/cards/06-lovers.jpg'),
  '7-chariot': require('../../assets/tarot/cards/07-chariot.jpg'),
  '8-strength': require('../../assets/tarot/cards/08-strength.jpg'),
  '9-hermit': require('../../assets/tarot/cards/09-hermit.jpg'),
  '10-wheel-of-fortune': require('../../assets/tarot/cards/10-wheel-of-fortune.jpg'),
  '11-justice': require('../../assets/tarot/cards/11-justice.jpg'),
  '12-hanged-man': require('../../assets/tarot/cards/12-hanged-man.jpg'),
  '13-death': require('../../assets/tarot/cards/13-death.jpg'),
  '14-temperance': require('../../assets/tarot/cards/14-temperance.jpg'),
  '15-devil': require('../../assets/tarot/cards/15-devil.jpg'),
  '16-tower': require('../../assets/tarot/cards/16-tower.jpg'),
  '17-star': require('../../assets/tarot/cards/17-star.jpg'),
  '18-moon': require('../../assets/tarot/cards/18-moon.jpg'),
  '19-sun': require('../../assets/tarot/cards/19-sun.jpg'),
  '20-judgement': require('../../assets/tarot/cards/20-judgement.jpg'),
  '21-world': require('../../assets/tarot/cards/21-world.jpg'),
};

export function getTarotCardImage(cardId: string): any {
  return TAROT_IMAGE_MAP[cardId] || TAROT_CARD_BACK;
}
