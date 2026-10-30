import { describe, expect, it } from 'vitest';
import { modeleCampagne, prospectDepuisOsm, prospectsDepuisOverpass } from '../src';

describe('prospection OpenStreetMap', () => {
  it('convertit un restaurant avec adresse et contacts', () => {
    const p = prospectDepuisOsm({
      type: 'node',
      id: 42,
      lat: -21.0,
      lon: 55.27,
      tags: {
        name: 'Le Bistrot',
        amenity: 'restaurant',
        'addr:housenumber': '12',
        'addr:street': 'Rue du Port',
        'addr:city': 'Saint-Paul',
        phone: '+262 262 11 22 33;+262 692 00 00 00',
        'contact:email': 'Contact@Bistrot.re',
      },
    });
    expect(p).toEqual({
      osm_id: 'node/42', nom: 'Le Bistrot', categorie: 'restaurant', commune: 'Saint-Paul', adresse: '12 Rue du Port',
      lat: -21.0, lng: 55.27, telephone: '+262 262 11 22 33', email: 'contact@bistrot.re', site: null,
    });
  });
  it('prend le centre des bâtiments et classe les hébergements', () => {
    const p = prospectDepuisOsm({ type: 'way', id: 7, center: { lat: -21.1, lon: 55.5 }, tags: { name: 'Gîte du Volcan', tourism: 'guest_house' } });
    expect(p?.categorie).toBe('hebergement');
    expect(p?.lat).toBe(-21.1);
  });
  it('ignore les lieux sans nom et les doublons', () => {
    const fiches = prospectsDepuisOverpass({
      elements: [
        { type: 'node', id: 1, tags: { amenity: 'bar' } },
        { type: 'node', id: 2, tags: { name: 'Ti Bar', amenity: 'pub' } },
        { type: 'node', id: 2, tags: { name: 'Ti Bar', amenity: 'pub' } },
      ],
    });
    expect(fiches.map((f) => [f.nom, f.categorie])).toEqual([['Ti Bar', 'bar']]);
  });
  it('message de lancement : frais lus dans les paramètres, ni « ! » ni montant écrit en dur', () => {
    const m = modeleCampagne('19,00 €');
    expect(m.message).toContain('19,00 € HT par mise en relation');
    expect(modeleCampagne('22,00 €').message).toContain('22,00 €');
    expect(m.message + m.sujet).not.toContain('!');
    expect(m.message).toContain('{commune}');
  });
});
