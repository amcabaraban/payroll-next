-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: payroll_next
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `type` enum('in','out','status') NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date` date DEFAULT (curdate()),
  `notes` text,
  `status` enum('present','absent','awol','awl','holiday','leave','VL','SL','EL','BL') NOT NULL DEFAULT 'present',
  `dtr_status` enum('pending','approved','locked') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attendance` (`user_id`,`date`,`type`),
  KEY `idx_attendance_user_date` (`user_id`,`date`),
  KEY `idx_attendance_date` (`date`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=335 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (284,1,'Cabaraban, Arthur M.','in','2026-05-31 23:59:00','2026-06-01',NULL,'present','approved'),(285,1,'Cabaraban, Arthur M.','out','2026-06-01 13:05:00','2026-06-01',NULL,'present','approved'),(286,1,'Cabaraban, Arthur M.','in','2026-06-02 00:00:00','2026-06-02',NULL,'present','approved'),(287,1,'Cabaraban, Arthur M.','out','2026-06-02 09:01:00','2026-06-02',NULL,'present','approved'),(288,1,'Cabaraban, Arthur M.','in','2026-06-03 00:00:00','2026-06-03',NULL,'present','approved'),(289,1,'Cabaraban, Arthur M.','out','2026-06-03 09:02:00','2026-06-03',NULL,'present','approved'),(290,1,'Cabaraban, Arthur M.','in','2026-06-04 00:00:00','2026-06-04',NULL,'present','approved'),(291,1,'Cabaraban, Arthur M.','out','2026-06-04 09:02:00','2026-06-04',NULL,'present','approved'),(292,1,'Cabaraban, Arthur M.','in','2026-06-05 00:00:00','2026-06-05',NULL,'present','approved'),(293,1,'Cabaraban, Arthur M.','out','2026-06-05 09:03:00','2026-06-05',NULL,'present','approved'),(294,1,'Cabaraban, Arthur M.','in','2026-06-06 00:00:00','2026-06-06',NULL,'present','approved'),(295,1,'Cabaraban, Arthur M.','out','2026-06-05 23:00:00','2026-06-06',NULL,'present','approved'),(296,1,'Cabaraban, Arthur M.','in','2026-06-08 00:00:00','2026-06-08',NULL,'present','approved'),(300,1,'Cabaraban, Arthur M.','in',NULL,'2026-06-09',NULL,'absent','approved'),(301,1,'Cabaraban, Arthur M.','out',NULL,'2026-06-09',NULL,'absent','approved'),(302,1,'Cabaraban, Arthur M.','in',NULL,'2026-06-10',NULL,'absent','approved'),(303,1,'Cabaraban, Arthur M.','out',NULL,'2026-06-10',NULL,'absent','approved'),(304,1,'System','in',NULL,'2026-06-11',NULL,'absent','approved'),(305,1,'Cabaraban, Arthur M.','in','2026-06-12 00:00:00','2026-06-12',NULL,'present','approved'),(306,1,'System','in',NULL,'2026-06-13',NULL,'absent','approved'),(307,1,'System','in',NULL,'2026-06-15',NULL,'absent','approved'),(308,1,'Cabaraban, Arthur M.','out','2026-06-08 14:17:00','2026-06-08',NULL,'present','approved'),(309,1,'Cabaraban, Arthur M.','in','2026-06-16 00:00:00','2026-06-16',NULL,'present','approved'),(310,1,'Cabaraban, Arthur M.','out','2026-06-16 09:15:00','2026-06-16',NULL,'present','approved'),(311,1,'Cabaraban, Arthur M.','in',NULL,'2026-06-30',NULL,'EL','approved'),(312,1,'Cabaraban, Arthur M.','in','2026-06-17 00:00:00','2026-06-17',NULL,'present','approved'),(313,1,'Cabaraban, Arthur M.','out','2026-06-17 09:30:00','2026-06-17',NULL,'present','approved'),(314,1,'Cabaraban, Arthur M.','in','2026-06-18 00:00:00','2026-06-18',NULL,'present','approved'),(315,1,'Cabaraban, Arthur M.','out','2026-06-18 09:02:00','2026-06-18',NULL,'present','approved'),(316,1,'Cabaraban, Arthur M.','in','2026-06-18 23:59:00','2026-06-19',NULL,'present','approved'),(317,1,'Cabaraban, Arthur M.','out','2026-06-19 09:01:00','2026-06-19',NULL,'present','approved'),(318,1,'Cabaraban, Arthur M.','in','2026-06-20 00:00:00','2026-06-20',NULL,'present','approved'),(319,1,'Cabaraban, Arthur M.','out','2026-06-20 09:04:00','2026-06-20',NULL,'present','approved'),(320,1,'Cabaraban, Arthur M.','in','2026-06-22 00:00:00','2026-06-22',NULL,'present','approved'),(321,1,'Cabaraban, Arthur M.','out','2026-06-22 09:06:00','2026-06-22',NULL,'present','approved'),(322,1,'Cabaraban, Arthur M.','in','2026-06-22 23:42:00','2026-06-23',NULL,'present','approved'),(323,1,'Cabaraban, Arthur M.','out','2026-06-23 09:09:00','2026-06-23',NULL,'present','approved'),(324,1,'Cabaraban, Arthur M.','in','2026-06-23 23:57:00','2026-06-24',NULL,'present','approved'),(325,1,'Cabaraban, Arthur M.','out','2026-06-24 09:13:00','2026-06-24',NULL,'present','approved'),(326,1,'Cabaraban, Arthur M.','in','2026-06-25 00:00:00','2026-06-25',NULL,'present','approved'),(327,1,'Cabaraban, Arthur M.','out','2026-06-25 09:04:00','2026-06-25',NULL,'present','approved'),(328,1,'Cabaraban, Arthur M.','in','2026-06-26 00:00:00','2026-06-26',NULL,'present','approved'),(329,1,'Cabaraban, Arthur M.','out','2026-06-26 09:04:00','2026-06-26',NULL,'present','approved'),(330,1,'Cabaraban, Arthur M.','in',NULL,'2026-06-27',NULL,'awl','approved'),(331,1,'Cabaraban, Arthur M.','out',NULL,'2026-06-27',NULL,'awl','approved'),(332,1,'Cabaraban, Arthur M.','in','2026-06-29 00:00:00','2026-06-29',NULL,'present','approved'),(333,1,'Cabaraban, Arthur M.','out','2026-06-29 09:11:00','2026-06-29',NULL,'present','approved'),(334,1,'Cabaraban, Arthur M.','out','2026-06-12 09:03:00','2026-06-12',NULL,'present','approved');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-11 16:19:19
