import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvFilePath = path.join(process.cwd(), 'pornhub-database', 'pornhub.com-db.csv');

    if (!fs.existsSync(csvFilePath)) {
      // Return mock filter options if CSV doesn't exist
      return NextResponse.json({
        sources: ['brazzers.com', 'cumbots.com', 'realitykings.com', 'bangbros.com'],
        categories: ['Brunette', 'Toys', 'Pornstar', 'Big Tits', 'Blowjob', 'MILF', 'Teen'],
        performers: ['Gen Padova', 'Mandy May', 'Lani Lane', 'Alicia Rhodes', 'Brooke'],
        dateRange: {
          earliest: '2007-12-10',
          latest: '2022-12-31'
        }
      });
    }

    // For demo purposes, return comprehensive filter options
    // In production, you would analyze the CSV to extract these
    const filterOptions = {
      sources: [
        'brazzers.com',
        'cumbots.com',
        'realitykings.com',
        'bangbros.com',
        'naughtyamerica.com',
        'pornpros.com',
        'teamskeet.com',
        'mofos.com',
        'twistys.com',
        'digitalplayground.com'
      ],
      categories: [
        'Brunette',
        'Toys',
        'Pornstar',
        'Big Tits',
        'Blowjob',
        'MILF',
        'Teen',
        'Anal',
        'HD',
        'VR',
        'Amateur',
        'Professional',
        'Lesbian',
        'Group Sex',
        'Solo Female',
        'Solo Male',
        'Creampie',
        'Facials',
        'Deep Throat'
      ],
      performers: [
        'Gen Padova',
        'Mandy May',
        'Lani Lane',
        'Alicia Rhodes',
        'Brooke',
        'Sara Stone',
        'Alexis Fawx',
        'Nicole Aniston',
        'Abella Danger',
        'Riley Reid',
        'Many More Performers'
      ],
      dateRange: {
        earliest: '2007-12-10',
        latest: '2022-12-31'
      }
    };

    return NextResponse.json(filterOptions);

  } catch (error) {
    console.error('Error getting filter options:', error);

    return NextResponse.json(
      {
        error: 'Failed to get filter options',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}