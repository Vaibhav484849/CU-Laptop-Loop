import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * ============================================================
 * CU LaptopLoop — Core Rental Business Logic (Java)
 * ============================================================
 * Beginner-friendly Java class handling:
 * 1. Rental duration & total price calculations
 * 2. Double-booking date overlap collision checks
 * 3. Chandigarh University Student UID format validation
 * 4. Demonstration payment transaction ID generation
 *
 * Can be compiled easily with: javac RentalLogic.java
 * Can be run standalone with:  java RentalLogic
 * ============================================================
 */
public class RentalLogic {

    /**
     * Calculates the number of rental days and total cost.
     * Inclusive of both start and end days.
     */
    public static String calculateRentalCost(double pricePerDay, String startDateStr, String endDateStr) {
        try {
            LocalDate start = LocalDate.parse(startDateStr.trim());
            LocalDate end = LocalDate.parse(endDateStr.trim());

            if (end.isBefore(start)) {
                return "{\"valid\": false, \"message\": \"End date cannot be before start date.\"}";
            }

            long days = ChronoUnit.DAYS.between(start, end) + 1;
            double totalPrice = days * pricePerDay;

            return String.format(
                "{\"valid\": true, \"days\": %d, \"pricePerDay\": %.2f, \"totalPrice\": %.2f}",
                days, pricePerDay, totalPrice
            );
        } catch (DateTimeParseException e) {
            return "{\"valid\": false, \"message\": \"Invalid date format. Use YYYY-MM-DD.\"}";
        }
    }

    /**
     * Checks if a requested booking date range overlaps with an existing confirmed booking.
     * Overlap condition: NOT (newStart > existingEnd OR newEnd < existingStart)
     */
    public static String checkDateOverlap(String existingStartStr, String existingEndStr, String reqStartStr, String reqEndStr) {
        try {
            LocalDate exStart = LocalDate.parse(existingStartStr.trim());
            LocalDate exEnd = LocalDate.parse(existingEndStr.trim());
            LocalDate reqStart = LocalDate.parse(reqStartStr.trim());
            LocalDate reqEnd = LocalDate.parse(reqEndStr.trim());

            boolean overlaps = !reqStart.isAfter(exEnd) && !reqEnd.isBefore(exStart);

            return String.format("{\"overlap\": %b}", overlaps);
        } catch (DateTimeParseException e) {
            return "{\"overlap\": false, \"error\": \"Invalid date format.\"}";
        }
    }

    /**
     * Validates Chandigarh University Student UID format (e.g., 21BCS1014, 22BCS2048, 23BIT1090).
     */
    public static String validateStudentUID(String uid) {
        if (uid == null || uid.trim().length() < 5) {
            return "{\"valid\": false, \"message\": \"UID too short.\"}";
        }
        String clean = uid.trim().toUpperCase();
        // CU UIDs typically begin with 2 digits (admission year) followed by branch code and roll number
        boolean matches = clean.matches("^[0-9]{2}[A-Z]{2,4}[0-9]{3,6}$");
        return String.format("{\"valid\": %b, \"uid\": \"%s\"}", matches, clean);
    }

    /**
     * Generates a unique demonstration transaction reference.
     */
    public static String generateTransactionId() {
        String randomSuffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        long timestamp = System.currentTimeMillis() % 1000000;
        return String.format("{\"transactionId\": \"TXN_CU_%d_%s\"}", timestamp, randomSuffix);
    }

    /**
     * CLI entry point. Can be invoked from Node.js child_process or directly by a student.
     */
    public static void main(String[] args) {
        if (args.length == 0) {
            // Interactive demo self-test
            System.out.println("=== CU LaptopLoop Java Engine Self-Test ===");
            System.out.println("Price Calc (Rs 550, 2026-11-01 to 2026-11-04): " + calculateRentalCost(550.0, "2026-11-01", "2026-11-04"));
            System.out.println("Overlap Check (Nov 5-10 vs Nov 8-12): " + checkDateOverlap("2026-11-05", "2026-11-10", "2026-11-08", "2026-11-12"));
            System.out.println("UID Validation (21BCS1014): " + validateStudentUID("21BCS1014"));
            System.out.println("Transaction ID: " + generateTransactionId());
            return;
        }

        String command = args[0].toLowerCase();
        switch (command) {
            case "calculate":
                if (args.length >= 4) {
                    double price = Double.parseDouble(args[1]);
                    System.out.println(calculateRentalCost(price, args[2], args[3]));
                }
                break;
            case "overlap":
                if (args.length >= 5) {
                    System.out.println(checkDateOverlap(args[1], args[2], args[3], args[4]));
                }
                break;
            case "validate-uid":
                if (args.length >= 2) {
                    System.out.println(validateStudentUID(args[1]));
                }
                break;
            case "txn-id":
                System.out.println(generateTransactionId());
                break;
            default:
                System.out.println("{\"error\": \"Unknown command\"}");
                break;
        }
    }
}
