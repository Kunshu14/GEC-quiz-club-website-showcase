/**
 * Google Form / Sheet Response Parser for Participant & Roster Import
 * (Section 7.14 & Section 7.16)
 *
 * Handles:
 * 1. Comma-separated (CSV) and Tab-separated (TSV) strings (copy-pasted from Google Sheets/Excel).
 * 2. Multi-member team formats (Member 1 Name, Member 1 Email, Member 2 Name, etc.).
 * 3. Solo participant formats (Name, Email, College, optional Team Name).
 * 4. Flexible header matching ignoring case, punctuation, and slight variations.
 */

export interface ParsedMember {
  name: string;
  email?: string;
  college?: string;
}

export interface ParsedTeam {
  teamName: string;
  members: ParsedMember[];
  originalRowIndex: number;
}

export interface ParseResult {
  isTeamFormat: boolean;
  detectedHeaders: string[];
  teams: ParsedTeam[];
  totalParticipants: number;
  warnings: string[];
  errors: string[];
}

/**
 * Parses raw CSV or TSV string into an array of row arrays, correctly handling
 * quoted strings that contain commas, tabs, or escaped quotes.
 */
export function parseDelimitedText(rawText: string): string[][] {
  const text = rawText.trim();
  if (!text) return [];

  // Determine delimiter: tab (\t) if prevalent in first line, otherwise comma (,)
  const firstLine = text.split(/\r\n|\n|\r/)[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r" || char === "\n") {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip LF in CRLF
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Push final field & row if not empty
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header string for heuristic matching (lowercased, alphanumeric only)
 */
function cleanHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Evaluates column indices and extracts teams from parsed 2D array
 */
export function parseGoogleFormResponse(rawText: string): ParseResult {
  const rows = parseDelimitedText(rawText);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (rows.length < 2) {
    return {
      isTeamFormat: false,
      detectedHeaders: [],
      teams: [],
      totalParticipants: 0,
      warnings: [],
      errors: ["Data must include at least 1 header row and 1 data row."],
    };
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map(cleanHeader);

  // Detect Team Name column
  const teamNameIdx = headers.findIndex((h) =>
    h.includes("teamname") || h === "team" || h.includes("nameofteam")
  );

  // Check if we have multi-member columns: "member1", "member2", "participant1", etc.
  const memberRegex = /(?:member|participant|player|p)(\d+)(name|email|college|institution|org)?/;
  const hasNumberedMembers = headers.some((h) => memberRegex.test(h));

  const teams: ParsedTeam[] = [];
  const seenEmailsInImport = new Set<string>();

  if (hasNumberedMembers) {
    // Multi-member format across columns in a single row
    // Locate columns for each member number (1 through 6)
    const memberSlots: {
      number: number;
      nameIdx: number;
      emailIdx: number;
      collegeIdx: number;
    }[] = [];

    for (let m = 1; m <= 6; m++) {
      let nameIdx = -1;
      let emailIdx = -1;
      let collegeIdx = -1;

      headers.forEach((h, idx) => {
        const hasNum = h.includes(String(m)) || h.includes(`member${m}`) || h.includes(`p${m}`);
        if (!hasNum) return;

        if (h.includes("email") || h.includes("mail")) {
          emailIdx = idx;
        } else if (h.includes("college") || h.includes("inst") || h.includes("org") || h.includes("dept")) {
          collegeIdx = idx;
        } else if (h.includes("name") || h === `member${m}` || h === `p${m}`) {
          nameIdx = idx;
        }
      });

      if (nameIdx !== -1) {
        memberSlots.push({ number: m, nameIdx, emailIdx, collegeIdx });
      }
    }

    // Process data rows
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const members: ParsedMember[] = [];

      for (const slot of memberSlots) {
        const name = row[slot.nameIdx]?.trim();
        if (name) {
          const email = slot.emailIdx !== -1 ? row[slot.emailIdx]?.trim() : undefined;
          const college = slot.collegeIdx !== -1 ? row[slot.collegeIdx]?.trim() : undefined;

          if (email && seenEmailsInImport.has(email.toLowerCase())) {
            warnings.push(`Row ${r + 1}: Email "${email}" appears multiple times in sheet.`);
          }
          if (email) seenEmailsInImport.add(email.toLowerCase());

          members.push({
            name,
            email: email || undefined,
            college: college || undefined,
          });
        }
      }

      if (members.length > 0) {
        const rawTeamName = teamNameIdx !== -1 ? row[teamNameIdx]?.trim() : "";
        const teamName = rawTeamName || `${members[0].name}'s Team`;

        teams.push({
          teamName,
          members,
          originalRowIndex: r + 1,
        });
      }
    }

    const totalParticipants = teams.reduce((acc, t) => acc + t.members.length, 0);

    return {
      isTeamFormat: true,
      detectedHeaders: rawHeaders,
      teams,
      totalParticipants,
      warnings,
      errors,
    };
  } else {
    // Solo format or 1 row per participant
    // Look for single name, email, college columns
    const nameIdx = headers.findIndex((h) =>
      h.includes("fullname") ||
      h.includes("participantname") ||
      h.includes("yourname") ||
      h.includes("studentname") ||
      h === "name"
    );

    const emailIdx = headers.findIndex((h) =>
      h.includes("email") || h.includes("emailaddress") || h === "mail"
    );

    const collegeIdx = headers.findIndex((h) =>
      h.includes("college") || h.includes("institution") || h.includes("university") || h.includes("org")
    );

    if (nameIdx === -1) {
      errors.push("Could not identify a participant Name column in the header row.");
      return {
        isTeamFormat: false,
        detectedHeaders: rawHeaders,
        teams: [],
        totalParticipants: 0,
        warnings,
        errors,
      };
    }

    // Check if rows are grouped by teamName, or individual solo entries
    const teamMap = new Map<string, ParsedTeam>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      const email = emailIdx !== -1 ? row[emailIdx]?.trim() : undefined;
      const college = collegeIdx !== -1 ? row[collegeIdx]?.trim() : undefined;
      const rawTeamName = teamNameIdx !== -1 ? row[teamNameIdx]?.trim() : "";

      if (email && seenEmailsInImport.has(email.toLowerCase())) {
        warnings.push(`Row ${r + 1}: Email "${email}" appears multiple times in sheet.`);
      }
      if (email) seenEmailsInImport.add(email.toLowerCase());

      const member: ParsedMember = {
        name,
        email: email || undefined,
        college: college || undefined,
      };

      if (rawTeamName) {
        // Group multiple rows into one team if team name matches
        if (!teamMap.has(rawTeamName)) {
          teamMap.set(rawTeamName, {
            teamName: rawTeamName,
            members: [member],
            originalRowIndex: r + 1,
          });
        } else {
          teamMap.get(rawTeamName)!.members.push(member);
        }
      } else {
        // Solo entry
        teams.push({
          teamName: name, // In solo mode, teamName defaults to participant's name
          members: [member],
          originalRowIndex: r + 1,
        });
      }
    }

    // Add grouped teams
    teamMap.forEach((team) => teams.push(team));

    const totalParticipants = teams.reduce((acc, t) => acc + t.members.length, 0);

    return {
      isTeamFormat: teamNameIdx !== -1 || teamMap.size > 0,
      detectedHeaders: rawHeaders,
      teams,
      totalParticipants,
      warnings,
      errors,
    };
  }
}
