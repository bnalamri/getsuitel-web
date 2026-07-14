// Country → timezone mapping for GetSuitel org settings
// Used by: OrgSettingsForm (UI) and cron jobs (midnight filtering)

export type CityTz  = { city: string; tz: string }
export type Country = { name: string; code: string; zones: CityTz[] }

export const COUNTRIES: Country[] = [
  // ── Middle East (primary market) ─────────────────────────────────────────────
  { name: 'Bahrain',       code: 'BH', zones: [{ city: 'Manama',            tz: 'Asia/Bahrain'   }] },
  { name: 'Egypt',         code: 'EG', zones: [{ city: 'Cairo',             tz: 'Africa/Cairo'   }] },
  { name: 'Iraq',          code: 'IQ', zones: [{ city: 'Baghdad',           tz: 'Asia/Baghdad'   }] },
  { name: 'Jordan',        code: 'JO', zones: [{ city: 'Amman',             tz: 'Asia/Amman'     }] },
  { name: 'Kuwait',        code: 'KW', zones: [{ city: 'Kuwait City',       tz: 'Asia/Kuwait'    }] },
  { name: 'Lebanon',       code: 'LB', zones: [{ city: 'Beirut',            tz: 'Asia/Beirut'    }] },
  { name: 'Libya',         code: 'LY', zones: [{ city: 'Tripoli',           tz: 'Africa/Tripoli' }] },
  { name: 'Oman',          code: 'OM', zones: [{ city: 'Muscat',            tz: 'Asia/Muscat'    }] },
  { name: 'Palestine',     code: 'PS', zones: [{ city: 'Gaza',              tz: 'Asia/Gaza'      }] },
  { name: 'Qatar',         code: 'QA', zones: [{ city: 'Doha',              tz: 'Asia/Qatar'     }] },
  { name: 'Saudi Arabia',  code: 'SA', zones: [{ city: 'Riyadh',            tz: 'Asia/Riyadh'   }] },
  { name: 'Syria',         code: 'SY', zones: [{ city: 'Damascus',          tz: 'Asia/Damascus'  }] },
  { name: 'UAE',           code: 'AE', zones: [{ city: 'Dubai',             tz: 'Asia/Dubai'     }] },
  { name: 'Yemen',         code: 'YE', zones: [{ city: 'Aden',              tz: 'Asia/Aden'      }] },

  // ── North Africa ─────────────────────────────────────────────────────────────
  { name: 'Algeria',       code: 'DZ', zones: [{ city: 'Algiers',           tz: 'Africa/Algiers'      }] },
  { name: 'Morocco',       code: 'MA', zones: [{ city: 'Casablanca',        tz: 'Africa/Casablanca'   }] },
  { name: 'Sudan',         code: 'SD', zones: [{ city: 'Khartoum',          tz: 'Africa/Khartoum'     }] },
  { name: 'Tunisia',       code: 'TN', zones: [{ city: 'Tunis',             tz: 'Africa/Tunis'        }] },

  // ── Sub-Saharan Africa ────────────────────────────────────────────────────────
  { name: 'Ethiopia',      code: 'ET', zones: [{ city: 'Addis Ababa',       tz: 'Africa/Addis_Ababa'     }] },
  { name: 'Ghana',         code: 'GH', zones: [{ city: 'Accra',             tz: 'Africa/Accra'           }] },
  { name: 'Kenya',         code: 'KE', zones: [{ city: 'Nairobi',           tz: 'Africa/Nairobi'         }] },
  { name: 'Nigeria',       code: 'NG', zones: [{ city: 'Lagos',             tz: 'Africa/Lagos'           }] },
  { name: 'South Africa',  code: 'ZA', zones: [{ city: 'Johannesburg',      tz: 'Africa/Johannesburg'    }] },
  { name: 'Tanzania',      code: 'TZ', zones: [{ city: 'Dar es Salaam',     tz: 'Africa/Dar_es_Salaam'   }] },
  { name: 'Uganda',        code: 'UG', zones: [{ city: 'Kampala',           tz: 'Africa/Kampala'         }] },
  { name: 'Zimbabwe',      code: 'ZW', zones: [{ city: 'Harare',            tz: 'Africa/Harare'          }] },

  // ── South & Southeast Asia ───────────────────────────────────────────────────
  { name: 'Bangladesh',    code: 'BD', zones: [{ city: 'Dhaka',             tz: 'Asia/Dhaka'         }] },
  { name: 'China',         code: 'CN', zones: [{ city: 'Beijing',           tz: 'Asia/Shanghai'      }] },
  { name: 'Hong Kong',     code: 'HK', zones: [{ city: 'Hong Kong',         tz: 'Asia/Hong_Kong'     }] },
  { name: 'India',         code: 'IN', zones: [{ city: 'New Delhi',         tz: 'Asia/Kolkata'       }] },
  { name: 'Indonesia',     code: 'ID', zones: [
    { city: 'Jakarta',   tz: 'Asia/Jakarta'  },
    { city: 'Makassar',  tz: 'Asia/Makassar' },
    { city: 'Jayapura',  tz: 'Asia/Jayapura' },
  ]},
  { name: 'Japan',         code: 'JP', zones: [{ city: 'Tokyo',             tz: 'Asia/Tokyo'         }] },
  { name: 'Malaysia',      code: 'MY', zones: [{ city: 'Kuala Lumpur',      tz: 'Asia/Kuala_Lumpur'  }] },
  { name: 'Myanmar',       code: 'MM', zones: [{ city: 'Yangon',            tz: 'Asia/Yangon'        }] },
  { name: 'Nepal',         code: 'NP', zones: [{ city: 'Kathmandu',         tz: 'Asia/Kathmandu'     }] },
  { name: 'Pakistan',      code: 'PK', zones: [{ city: 'Karachi',           tz: 'Asia/Karachi'       }] },
  { name: 'Philippines',   code: 'PH', zones: [{ city: 'Manila',            tz: 'Asia/Manila'        }] },
  { name: 'Singapore',     code: 'SG', zones: [{ city: 'Singapore',         tz: 'Asia/Singapore'     }] },
  { name: 'South Korea',   code: 'KR', zones: [{ city: 'Seoul',             tz: 'Asia/Seoul'         }] },
  { name: 'Sri Lanka',     code: 'LK', zones: [{ city: 'Colombo',           tz: 'Asia/Colombo'       }] },
  { name: 'Taiwan',        code: 'TW', zones: [{ city: 'Taipei',            tz: 'Asia/Taipei'        }] },
  { name: 'Thailand',      code: 'TH', zones: [{ city: 'Bangkok',           tz: 'Asia/Bangkok'       }] },
  { name: 'Vietnam',       code: 'VN', zones: [{ city: 'Ho Chi Minh City',  tz: 'Asia/Ho_Chi_Minh'   }] },

  // ── Central & West Asia ──────────────────────────────────────────────────────
  { name: 'Afghanistan',   code: 'AF', zones: [{ city: 'Kabul',             tz: 'Asia/Kabul'          }] },
  { name: 'Azerbaijan',    code: 'AZ', zones: [{ city: 'Baku',              tz: 'Asia/Baku'           }] },
  { name: 'Georgia',       code: 'GE', zones: [{ city: 'Tbilisi',           tz: 'Asia/Tbilisi'        }] },
  { name: 'Iran',          code: 'IR', zones: [{ city: 'Tehran',            tz: 'Asia/Tehran'         }] },
  { name: 'Kazakhstan',    code: 'KZ', zones: [
    { city: 'Almaty',    tz: 'Asia/Almaty' },
    { city: 'Aktau',     tz: 'Asia/Aqtau'  },
  ]},
  { name: 'Turkey',        code: 'TR', zones: [{ city: 'Istanbul',          tz: 'Europe/Istanbul'     }] },
  { name: 'Uzbekistan',    code: 'UZ', zones: [{ city: 'Tashkent',          tz: 'Asia/Tashkent'       }] },

  // ── Europe ───────────────────────────────────────────────────────────────────
  { name: 'Austria',       code: 'AT', zones: [{ city: 'Vienna',            tz: 'Europe/Vienna'    }] },
  { name: 'Belgium',       code: 'BE', zones: [{ city: 'Brussels',          tz: 'Europe/Brussels'  }] },
  { name: 'Bulgaria',      code: 'BG', zones: [{ city: 'Sofia',             tz: 'Europe/Sofia'     }] },
  { name: 'Cyprus',        code: 'CY', zones: [{ city: 'Nicosia',           tz: 'Asia/Nicosia'     }] },
  { name: 'Czech Republic',code: 'CZ', zones: [{ city: 'Prague',            tz: 'Europe/Prague'    }] },
  { name: 'Denmark',       code: 'DK', zones: [{ city: 'Copenhagen',        tz: 'Europe/Copenhagen'}] },
  { name: 'Finland',       code: 'FI', zones: [{ city: 'Helsinki',          tz: 'Europe/Helsinki'  }] },
  { name: 'France',        code: 'FR', zones: [{ city: 'Paris',             tz: 'Europe/Paris'     }] },
  { name: 'Germany',       code: 'DE', zones: [{ city: 'Berlin',            tz: 'Europe/Berlin'    }] },
  { name: 'Greece',        code: 'GR', zones: [{ city: 'Athens',            tz: 'Europe/Athens'    }] },
  { name: 'Hungary',       code: 'HU', zones: [{ city: 'Budapest',          tz: 'Europe/Budapest'  }] },
  { name: 'Ireland',       code: 'IE', zones: [{ city: 'Dublin',            tz: 'Europe/Dublin'    }] },
  { name: 'Israel',        code: 'IL', zones: [{ city: 'Jerusalem',         tz: 'Asia/Jerusalem'   }] },
  { name: 'Italy',         code: 'IT', zones: [{ city: 'Rome',              tz: 'Europe/Rome'      }] },
  { name: 'Netherlands',   code: 'NL', zones: [{ city: 'Amsterdam',         tz: 'Europe/Amsterdam' }] },
  { name: 'Norway',        code: 'NO', zones: [{ city: 'Oslo',              tz: 'Europe/Oslo'      }] },
  { name: 'Poland',        code: 'PL', zones: [{ city: 'Warsaw',            tz: 'Europe/Warsaw'    }] },
  { name: 'Portugal',      code: 'PT', zones: [{ city: 'Lisbon',            tz: 'Europe/Lisbon'    }] },
  { name: 'Romania',       code: 'RO', zones: [{ city: 'Bucharest',         tz: 'Europe/Bucharest' }] },
  { name: 'Russia',        code: 'RU', zones: [
    { city: 'Moscow',        tz: 'Europe/Moscow'       },
    { city: 'Yekaterinburg', tz: 'Asia/Yekaterinburg'  },
    { city: 'Novosibirsk',   tz: 'Asia/Novosibirsk'    },
    { city: 'Krasnoyarsk',   tz: 'Asia/Krasnoyarsk'    },
    { city: 'Irkutsk',       tz: 'Asia/Irkutsk'        },
    { city: 'Yakutsk',       tz: 'Asia/Yakutsk'        },
    { city: 'Vladivostok',   tz: 'Asia/Vladivostok'    },
    { city: 'Magadan',       tz: 'Asia/Magadan'        },
  ]},
  { name: 'Spain',         code: 'ES', zones: [{ city: 'Madrid',            tz: 'Europe/Madrid'    }] },
  { name: 'Sweden',        code: 'SE', zones: [{ city: 'Stockholm',         tz: 'Europe/Stockholm' }] },
  { name: 'Switzerland',   code: 'CH', zones: [{ city: 'Zurich',            tz: 'Europe/Zurich'    }] },
  { name: 'Ukraine',       code: 'UA', zones: [{ city: 'Kyiv',              tz: 'Europe/Kyiv'      }] },
  { name: 'United Kingdom',code: 'GB', zones: [{ city: 'London',            tz: 'Europe/London'    }] },

  // ── Americas ─────────────────────────────────────────────────────────────────
  { name: 'Argentina',     code: 'AR', zones: [{ city: 'Buenos Aires',      tz: 'America/Argentina/Buenos_Aires' }] },
  { name: 'Brazil',        code: 'BR', zones: [
    { city: 'São Paulo',  tz: 'America/Sao_Paulo'  },
    { city: 'Manaus',     tz: 'America/Manaus'      },
    { city: 'Belém',      tz: 'America/Belem'       },
    { city: 'Fortaleza',  tz: 'America/Fortaleza'   },
  ]},
  { name: 'Canada',        code: 'CA', zones: [
    { city: 'Toronto',      tz: 'America/Toronto'    },
    { city: 'Vancouver',    tz: 'America/Vancouver'  },
    { city: 'Calgary',      tz: 'America/Edmonton'   },
    { city: 'Winnipeg',     tz: 'America/Winnipeg'   },
    { city: 'Halifax',      tz: 'America/Halifax'    },
    { city: "St. John's",   tz: 'America/St_Johns'   },
  ]},
  { name: 'Chile',         code: 'CL', zones: [{ city: 'Santiago',          tz: 'America/Santiago'  }] },
  { name: 'Colombia',      code: 'CO', zones: [{ city: 'Bogotá',            tz: 'America/Bogota'    }] },
  { name: 'Mexico',        code: 'MX', zones: [
    { city: 'Mexico City', tz: 'America/Mexico_City' },
    { city: 'Tijuana',     tz: 'America/Tijuana'     },
    { city: 'Monterrey',   tz: 'America/Monterrey'   },
    { city: 'Hermosillo',  tz: 'America/Hermosillo'  },
    { city: 'Cancún',      tz: 'America/Cancun'      },
  ]},
  { name: 'Peru',          code: 'PE', zones: [{ city: 'Lima',              tz: 'America/Lima'       }] },
  { name: 'United States', code: 'US', zones: [
    { city: 'New York',    tz: 'America/New_York'    },
    { city: 'Chicago',     tz: 'America/Chicago'     },
    { city: 'Denver',      tz: 'America/Denver'      },
    { city: 'Los Angeles', tz: 'America/Los_Angeles' },
    { city: 'Phoenix',     tz: 'America/Phoenix'     },
    { city: 'Anchorage',   tz: 'America/Anchorage'   },
    { city: 'Honolulu',    tz: 'Pacific/Honolulu'    },
  ]},

  // ── Oceania ──────────────────────────────────────────────────────────────────
  { name: 'Australia',     code: 'AU', zones: [
    { city: 'Sydney',      tz: 'Australia/Sydney'    },
    { city: 'Melbourne',   tz: 'Australia/Melbourne' },
    { city: 'Brisbane',    tz: 'Australia/Brisbane'  },
    { city: 'Adelaide',    tz: 'Australia/Adelaide'  },
    { city: 'Perth',       tz: 'Australia/Perth'     },
    { city: 'Darwin',      tz: 'Australia/Darwin'    },
    { city: 'Hobart',      tz: 'Australia/Hobart'    },
  ]},
  { name: 'New Zealand',   code: 'NZ', zones: [
    { city: 'Auckland',        tz: 'Pacific/Auckland' },
    { city: 'Chatham Islands', tz: 'Pacific/Chatham'  },
  ]},
]

/**
 * Returns true if the current local hour in `tz` is midnight (00:xx).
 * Used by hourly cron jobs to decide which orgs to process.
 */
export function isOrgMidnight(tz: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour:      '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date())
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '12', 10)
    return hour === 0
  } catch {
    return false
  }
}

/**
 * Returns a display string like "GMT+4" for use in the UI.
 */
export function getUTCOffset(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch {
    return ''
  }
}
