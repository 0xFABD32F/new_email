-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : lun. 19 mai 2025 à 16:30
-- Version du serveur : 10.4.28-MariaDB
-- Version de PHP : 8.0.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `crm_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `alembic_version`
--

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `contact_name` varchar(255) NOT NULL,
  `contact_position` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `sector_field` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `payment_terms` text DEFAULT NULL,
  `invoice_terms` text DEFAULT NULL,
  `currency` varchar(20) DEFAULT NULL,
  `is_zone_franche` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `clients`
--

INSERT INTO `clients` (`id`, `company_name`, `contact_name`, `contact_position`, `phone`, `email`, `country`, `sector_field`, `address`, `payment_terms`, `invoice_terms`, `currency`, `is_zone_franche`) VALUES
(3, 'CAPP', 'el barni ayyoub', 'directeur MA', '0945345678', 'ayoub@gmail.com', 'france', 'Networking', 'RU CASA BLANCA, 2000', '30 jours', 'Facturation mensuelle', 'MAD', 'OUI'),
(4, 'UNIMER', 'Brahim Nadime', 'Directeur SI', '0662000000', 'Brahim.nadime@unimergroup.com', 'EZZ', 'Networking', 'casabalnca thechnopark', '30 jours', 'Facturation à la livraison', 'EUR', 'YES'),
(23, 'Silver food', 'boutaina kilani', 'Responsable achat', '0680000000', 'boutaina.kilani@silver-food.com', 'Morocco', 'Fishing', 'Commune rurale lakhyayta cercle de Berrechid douar Bouhala AA', 'Net 30', 'Rappeler le numéro de la présente commande\nSur chaque colis\nSur le bon de livraison\nSur la facture en 3 exemplaires', 'MAD', 'OUI'),
(24, 'Silver food', 'Mohamed Bensedik', 'Directeur Achat', '0676000000', 'mohamed.bensedik@silver-food.com', 'Morocco', 'Fishing', 'Commune rurale lakhyayta cercle de Berrechid douar Bouhala', 'Net 30', 'Rappeler le numéro de la présente commande\nSur chaque colis\nSur le bon de livraison\nSur la facture en 3 exemplaires', 'MAD', 'OUI'),
(25, 'UNIMER', 'Mehdi Laalej', 'Directeur Général', '0662000000', 'mehdi.laalej@unimer.ma', 'Morocco', 'Fishing', 'Adresse inconnue', 'Net 30', 'Facturation à la livraison', 'MAD', 'NO'),
(26, 'Ajainvest', 'Karim SEDRATI', 'Responsable achat', '0672000000', 'k.sedrati@ajarinvest.ma', 'Morocco', 'Banking', 'Complexe suncity imm D, rue al bortokal, Hay Ryad Rabat', 'Net 30', 'Facturation mensuelle', 'MAD', 'NO'),
(27, 'CDM', 'Younes Ennouchi', 'Responsable Achat', '0661000000', 'Younes.Ennouchi@cdm.ma', 'Morocco', 'Banking', 'Espace les Arenes, 201 Bd d’Anfa, Casablanca', 'Net 30', 'Facturation mensuelle', 'MAD', 'NO'),
(30, 'BT', 'Nandita Ghosh', 'Responsable achat', '019007952944', 'nandita.ghosh@bt.com', 'UK', 'Telecom', 'BT Group plc 1 Brahman Street London E1 BEE', 'Net 30', 'Facturation mensuelle', 'US/MAD', 'Yes/No'),
(32, 'x', 'youssef EL', 'responsable', '0934564567', 'youssef@gmail.com', 'france', 'Datacenter', 'Paris 10000', '30 net', 'fac', 'EUR', 'OUI');

-- --------------------------------------------------------

--
-- Structure de la table `devis_items`
--

CREATE TABLE `devis_items` (
  `id` int(11) NOT NULL,
  `devis_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `pn` varchar(100) DEFAULT NULL,
  `eq_reference` text DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `unit_price` float DEFAULT NULL,
  `total_price` float DEFAULT NULL,
  `poids_kg` float DEFAULT NULL,
  `pays_destination` varchar(100) DEFAULT NULL,
  `shipping_cost` float DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `devis_items`
--

INSERT INTO `devis_items` (`id`, `devis_id`, `product_id`, `brand`, `pn`, `eq_reference`, `qty`, `unit_price`, `total_price`, `poids_kg`, `pays_destination`, `shipping_cost`, `category`) VALUES
(2, 5, 13, 'cisco', 'VB123', 'equipmment de marque  cisco', 1, 120, 120, 300, 'Morocco', 26699, 'hardware'),
(3, 5, 12, 'cable RJ45', 'xb123', 'ce', 12, 120, 1440, 30, 'Morocco', 2669, 'hardware');

-- --------------------------------------------------------

--
-- Structure de la table `devis_oddnet`
--

CREATE TABLE `devis_oddnet` (
  `id` int(11) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `devis_number` varchar(255) DEFAULT NULL,
  `date_creation` date DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_position` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `project` text DEFAULT NULL,
  `sector_field` varchar(255) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `total_amount` float DEFAULT NULL,
  `tva` float DEFAULT NULL,
  `discount` float DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `po_client` varchar(255) DEFAULT NULL,
  `eta` varchar(50) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `shipping_total` float DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `devis_oddnet`
--

INSERT INTO `devis_oddnet` (`id`, `reference`, `devis_number`, `date_creation`, `client_id`, `company_name`, `contact_name`, `contact_position`, `email`, `phone`, `country`, `project`, `sector_field`, `currency`, `total_amount`, `tva`, `discount`, `status`, `po_client`, `eta`, `comment`, `shipping_total`) VALUES
(5, 'DEV-2025-351', 'DEV-2025-877', '2025-05-18', 27, 'CDM', 'Younes Ennouchi', 'Responsable Achat', 'Younes.Ennouchi@cdm.ma', '0661000000', 'Morocco', 'projet de gestion des stocke', 'Banking', 'MAD', 1872, 20, 0, 'Nouveau', 'NBCH1233', '2 semaine', '', 29368);

-- --------------------------------------------------------

--
-- Structure de la table `hardware_it`
--

CREATE TABLE `hardware_it` (
  `id` int(11) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `pn` varchar(100) DEFAULT NULL,
  `eq_reference` text DEFAULT NULL,
  `unit_cost_mad` decimal(10,2) DEFAULT NULL,
  `p_margin` decimal(10,2) DEFAULT NULL,
  `transit` varchar(50) DEFAULT NULL,
  `douane` varchar(50) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `eta` varchar(50) DEFAULT NULL,
  `devis_number` varchar(50) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `poids_kg` float DEFAULT 0,
  `unit_cost` float DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `rate` float DEFAULT 10.5,
  `qty` int(11) DEFAULT 1,
  `total_cost` float DEFAULT NULL,
  `total_price` float DEFAULT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `project` varchar(255) DEFAULT NULL,
  `shipping_discount` float DEFAULT 0,
  `etat` varchar(20) DEFAULT NULL,
  `project_reference` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'ok'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `hardware_it`
--

INSERT INTO `hardware_it` (`id`, `brand`, `supplier_id`, `pn`, `eq_reference`, `unit_cost_mad`, `p_margin`, `transit`, `douane`, `unit_price`, `eta`, `devis_number`, `customer_id`, `country`, `poids_kg`, `unit_cost`, `currency`, `rate`, `qty`, `total_cost`, `total_price`, `dimensions`, `project`, `shipping_discount`, `etat`, `project_reference`, `status`) VALUES
(3, 'Dell', 8, 'S0U52A', 'HPE Aruba Networking User Experience Insight Sensor 6Ghz 11ax Cell', 1007.79, 20.00, NULL, '5%', 1209.35, '8W', 'SAP049', 3, 'Morocco', 99.9, 119.99, 'EUR', 10.5, 1, 1007.79, 1209.35, NULL, NULL, 20.01, NULL, NULL, 'ongoing'),
(4, 'VMware', 10, 'AEHDCB-123', 'gcbsudvh123ghb', 1200.00, 29.99, 'noveux', 'fv123', 1559.88, '4W', '12DVFV', 23, 'Maroc', 123, NULL, 'USD', 10.5, 1, 1200, 1559.88, NULL, NULL, 0, NULL, NULL, 'ok'),
(5, 'Dell', 8, 'HSHX', 'HSB123', 123.00, 20.00, '3W', '10%', 147.60, '2W', 'OA12', 4, 'Maroc', 70.9, NULL, 'USD', 10.5, 1, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'ok'),
(6, 'VMware', 10, 'h123', 'HU123', 120.00, 20.00, '', '', 144.00, '2W', 'QS123', 27, 'Maroc', 122, NULL, 'USD', 10.5, 1, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'ok'),
(7, 'cable RJ45', 7, 'VXG123', 'XFG123', 126.00, 20.00, '', '', 151.20, '2W', 'SP123', 27, 'UK', 100, 12, 'EUR', 10.5, 1, 126, 151.2, NULL, NULL, 0, NULL, 'GDHUGH123', 'ongoing');

-- --------------------------------------------------------

--
-- Structure de la table `leads`
--

CREATE TABLE `leads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `contact_name` varchar(255) NOT NULL,
  `contact_position` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `sector_field` varchar(255) DEFAULT NULL,
  `project` varchar(255) DEFAULT NULL,
  `current_step` varchar(255) DEFAULT NULL,
  `current_step_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Nouveau',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `reference_project` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `leads`
--

INSERT INTO `leads` (`id`, `company_name`, `contact_name`, `contact_position`, `email`, `phone`, `sector_field`, `project`, `current_step`, `current_step_date`, `status`, `created_at`, `updated_at`, `reference_project`, `country`, `client_id`) VALUES
(10, 'UNIMER', 'Brahim Nadime', 'Directeur SI', 'Brahim.nadime@unimergroup.com', '0662000000', 'Networking', 'base des donnnees', 'Demande devis', '2025-05-07', 'Converti', '2025-05-07 16:41:36', '2025-05-14 13:00:45', 'UNI25-296', 'EZZ', 4),
(11, 'BT', 'Nandita Ghosh', 'Responsable achat', 'nandita.ghosh@bt.com', '019007952944', 'Telecom', 'un projet technique', 'Demande devis', '2025-05-10', 'Converti', '2025-05-10 23:37:57', '2025-05-15 18:36:21', 'BT25-151', 'UK', 30),
(12, 'x', 'youssef EL', 'responsable', 'youssef@gmail.com', '0934564567', 'Datacenter', 'projet de vente quellque chose', 'Demande devis', '2025-05-13', 'Converti', '2025-05-13 15:07:20', '2025-05-13 15:43:02', 'X25-316', 'france', 32),
(13, 'Silver food', 'boutaina kilani', 'Responsable achat', 'boutaina.kilani@silver-food.com', '0680000000', 'Fishing', '', 'Demande devis', '2025-05-19', 'Converti', '2025-05-19 12:49:38', '2025-05-19 12:52:52', 'SIL25-868', 'Morocco', 23);

-- --------------------------------------------------------

--
-- Structure de la table `oddnet`
--

CREATE TABLE `oddnet` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `droit_acces` varchar(255) DEFAULT NULL,
  `mot_de_passe` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `oddnet`
--

INSERT INTO `oddnet` (`id`, `nom`, `role`, `email`, `phone`, `droit_acces`, `mot_de_passe`) VALUES
(7, 'Ali Yassine Banamara', 'CEO', 'yassine.benamara@odd-net.com', '661045894', 'Admin', '$2b$12$Z4HUgmZPwKJC5YoHQa6ijOJjogt8e086Uq.pL0bBzzI9fcpY.1nyS'),
(9, 'Youssef', 'Admin', 'youssef.loutfi@odd-net.com', '660359633', 'Admin', '$2b$12$LiCK7xiedVv/7NWmrtqrkeWrwbpogJ4WIyCDnsqkIakYrOYpX4BN.'),
(11, 'bader tahiri', 'Expert', 'bader@gmail.com', '0923456745', 'Expert', '$2b$12$b4A2MdfY40TC4Eb/69o8Kex4eldpkv4g8/8xKMwInJ7GawM.u.SmW'),
(13, 'el barni yassine ilisi', 'Admin', 'elbarni@gmail.com', '0934562345', 'Admin', '$2b$12$7Elcvu8E3L2aM.i.2mgQS.IcaxA2o0OLbh1.cDnoqMpSDFK6Y10cS');

-- --------------------------------------------------------

--
-- Structure de la table `opportunities`
--

CREATE TABLE `opportunities` (
  `id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `contact_name` varchar(255) NOT NULL,
  `contact_position` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `sector_field` varchar(255) DEFAULT NULL,
  `project` varchar(255) DEFAULT NULL,
  `current_step` varchar(255) DEFAULT NULL,
  `current_step_date` date DEFAULT NULL,
  `devis_number` varchar(255) DEFAULT NULL,
  `montant_devis` float DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  `lead_id` bigint(20) UNSIGNED DEFAULT NULL,
  `reference_project` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `client_deadline` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `opportunities`
--

INSERT INTO `opportunities` (`id`, `company_name`, `contact_name`, `contact_position`, `phone`, `email`, `sector_field`, `project`, `current_step`, `current_step_date`, `devis_number`, `montant_devis`, `created_at`, `updated_at`, `lead_id`, `reference_project`, `country`, `client_deadline`) VALUES
(26, 'UNIMER', 'Brahim Nadime', 'Directeur SI', '0662000000', 'Brahim.nadime@unimergroup.com', 'Networking', 'base des donnnees', 'PO Client', '2025-05-15', 'DEV-UNI-25-791', 2000, '2025-05-15 19:35:27', '2025-05-15 19:41:03', 10, 'UNI25-296', 'EZZ', '2025-09-09'),
(27, 'BT', 'Nandita Ghosh', 'Responsable achat', '019007952944', 'nandita.ghosh@bt.com', 'Telecom', 'un projet technique', 'PO Client', '2025-05-15', 'DEV-BT-25-472', 2000, '2025-05-15 19:36:39', '2025-05-15 19:40:52', 11, 'BT25-151', 'UK', '2025-09-09'),
(28, 'Silver food', 'boutaina kilani', 'Responsable achat', '0680000000', 'boutaina.kilani@silver-food.com', 'Fishing', '', 'Converti en projet', '2025-05-19', 'DEV-SIL-25-440', 20000, '2025-05-19 13:52:52', '2025-05-19 13:54:23', 13, 'SIL25-868', 'Morocco', '2025-09-09');

-----------------------------Structure de la table `tasks`

CREATE TABLE TASK (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    assigne_par INT NOT NULL,  -- ID from current_user table
    assigne_a INT NOT NULL,    -- ID from Oddnet table
    description TEXT,
    est_termine BOOLEAN DEFAULT FALSE,
    priority VARCHAR(50),

    -- Foreign keys (optional, depending on your schema)
    FOREIGN KEY (assigne_par) REFERENCES oddnet(id),
    FOREIGN KEY (assigne_a) REFERENCES oddnet(id)
);


-- --------------------------------------------------------

--
-- Structure de la table `opportunities_items`
--

CREATE TABLE `opportunities_items` (
  `id` int(11) NOT NULL,
  `opportunity_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `unit_price` float DEFAULT NULL,
  `total_price` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `po_items`
--

CREATE TABLE `po_items` (
  `id` int(11) NOT NULL,
  `po_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `unit_cost` float DEFAULT NULL,
  `unit_price` float DEFAULT NULL,
  `total_price` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `po_items`
--

INSERT INTO `po_items` (`id`, `po_id`, `product_id`, `qty`, `unit_cost`, `unit_price`, `total_price`) VALUES
(3, 5, 11, 1, 13, 13, 13),
(4, 1, 11, 12, 13, 13, 156);

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `pn` varchar(100) DEFAULT NULL,
  `eq_reference` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `unit_cost` float DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `rate` float DEFAULT NULL,
  `shipping_discount` decimal(10,2) DEFAULT NULL,
  `unit_cost_mad` float DEFAULT NULL,
  `p_margin` float DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `devis_number` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `qty` int(11) DEFAULT NULL,
  `total_price` varchar(100) DEFAULT NULL,
  `eta` varchar(50) DEFAULT NULL,
  `poids_kg` float DEFAULT 0,
  `transit` varchar(50) DEFAULT 'En attente',
  `douane` varchar(50) DEFAULT 'En attente',
  `dimensions` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `brand`, `supplier_id`, `pn`, `eq_reference`, `description`, `unit_cost`, `currency`, `rate`, `shipping_discount`, `unit_cost_mad`, `p_margin`, `customer_id`, `devis_number`, `country`, `qty`, `total_price`, `eta`, `poids_kg`, `transit`, `douane`, `dimensions`) VALUES
(11, 'CORNING', 11, 'F050502Q2Z20002M-VI', 'vv', 'CENTRAL TUBE INDOOR/OUTDOOR DIELECTRIC ARMOR CABLE (1X6) G50 MMF CLEARCURVE® OM4 CT 3,0 Note : Au lieu du câble OM3', 13, 'EUR', 20, 20.00, 260, 30, 4, 'VB123', 'maroc', 109, '1417', '12/09/2025', 10, 'En attente', 'En attente', NULL),
(12, 'cable RJ45', 7, 'xb123', 'ce', 'cece', 11.99, 'EUR', 10.5, 19.98, 125.895, 20, 4, 'VB123', 'MA', 12, '143.88', '', 30, 'En attente', 'En attente', NULL),
(13, 'cisco', 12, 'VB123', 'equipmment de marque  cisco', 'jidcidc', 120, 'EUR', 10.5, 0.00, 1260, 20, 24, 'VB00', 'USA', 3, '360', '', 300, '', '', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `product_shipping_info`
--

CREATE TABLE `product_shipping_info` (
  `id` int(11) NOT NULL,
  `product_id` int(11) DEFAULT NULL,
  `weight_kg` float DEFAULT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `destination_country` varchar(100) DEFAULT NULL,
  `direction` varchar(20) DEFAULT NULL,
  `premium_service` varchar(50) DEFAULT NULL,
  `shipping_cost` float DEFAULT NULL,
  `shipping_zone` int(11) DEFAULT NULL,
  `calculated_at` datetime DEFAULT NULL,
  `is_multi_leg` tinyint(1) DEFAULT NULL,
  `legs_data` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `product_shipping_info`
--

INSERT INTO `product_shipping_info` (`id`, `product_id`, `weight_kg`, `dimensions`, `destination_country`, `direction`, `premium_service`, `shipping_cost`, `shipping_zone`, `calculated_at`, `is_multi_leg`, `legs_data`) VALUES
(1, 11, 10, NULL, 'Chili', 'import', NULL, 889, 7, '2025-05-13 02:04:19', 0, NULL),
(2, 12, 30, NULL, 'MA', 'export', NULL, 2810, 0, '2025-05-13 03:05:32', 1, '[{\'origin_country\': \'CU\', \'destination_country\': \'MA\', \'direction\': \'export\'}, {\'origin_country\': \'MA\', \'destination_country\': \'FR\', \'direction\': \'export\'}]'),
(3, 13, 300, NULL, 'USA', 'import', NULL, 19757, 6, '2025-05-16 01:12:41', 0, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `client` varchar(255) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `po_client` varchar(255) DEFAULT NULL,
  `montant_po` float DEFAULT NULL,
  `devis_oddnet_final` varchar(255) DEFAULT NULL,
  `montant_devis_final` float DEFAULT NULL,
  `extra_cost` float DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `opportunity_id` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `projects`
--

INSERT INTO `projects` (`id`, `client`, `project_name`, `po_client`, `montant_po`, `devis_oddnet_final`, `montant_devis_final`, `extra_cost`, `status`, `start_date`, `end_date`, `description`, `opportunity_id`, `client_id`) VALUES
(8, 'BT', 'un projet thequnique', 'OI098', 2000, 'DEV-BT-25-472', 2000, 100, 'En attente', '2025-05-15', '2025-09-09', 'un projet technique', 27, 30),
(9, 'Silver food', 'gestion', 'ZE1233', 20000, 'DEV-SIL-25-440', 20000, 0, 'Terminé', '2025-05-19', '2025-09-09', '', 28, 23);

-- --------------------------------------------------------

--
-- Structure de la table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `date_creation` date DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `rate` float DEFAULT NULL,
  `total_amount` float DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `eta` varchar(50) DEFAULT NULL,
  `shipping_cost` float DEFAULT NULL,
  `discount` float DEFAULT NULL,
  `tva` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_number`, `supplier_id`, `date_creation`, `currency`, `rate`, `total_amount`, `status`, `eta`, `shipping_cost`, `discount`, `tva`) VALUES
(1, 'PO-2025-138', 11, '2025-05-05', 'EUR', 10.5, 141.12, 'Sent', '2W', 12, 30, 20),
(2, 'PO-2025-688', 7, '2025-05-07', 'USD', 10.5, 11.99, 'Draft', '2W', 0, 0, 0),
(4, 'PO-2025-523', 7, '2025-05-07', 'USD', 10.5, 11.99, 'Draft', '2W', 0, 0, 0),
(5, 'PO-2025-827', 11, '2025-05-08', 'MAD', 10.5, 13, 'Draft', '2W', 0, 0, 0),
(6, 'PO-2025-959', 8, '2025-05-10', 'MAD', 10.5, 0, 'Draft', '2W', 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `shipping_info`
--

CREATE TABLE `shipping_info` (
  `id` int(11) NOT NULL,
  `hardware_id` int(11) NOT NULL,
  `weight_kg` float NOT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `destination_country` varchar(100) NOT NULL,
  `direction` varchar(20) NOT NULL,
  `premium_service` varchar(50) DEFAULT NULL,
  `shipping_cost` float DEFAULT NULL,
  `shipping_zone` int(11) DEFAULT NULL,
  `calculated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `shipping_info`
--

INSERT INTO `shipping_info` (`id`, `hardware_id`, `weight_kg`, `dimensions`, `destination_country`, `direction`, `premium_service`, `shipping_cost`, `shipping_zone`, `calculated_at`) VALUES
(9, 3, 99.9, NULL, 'UK', 'import', NULL, 8800.1, 4, '2025-05-17 01:07:00'),
(10, 7, 100, NULL, 'UK', 'export', NULL, 8805, 4, '2025-05-17 21:21:01'),
(11, 4, 123, NULL, 'Russie', 'import', NULL, 10856, 4, '2025-05-18 20:57:08'),
(12, 6, 122, NULL, 'Malaisie', 'import', NULL, 12445, 5, '2025-05-18 20:56:32');

-- --------------------------------------------------------

--
-- Structure de la table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `company` varchar(255) NOT NULL,
  `domain` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `currency` varchar(10) DEFAULT NULL,
  `rib` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `reliability` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `suppliers`
--

INSERT INTO `suppliers` (`id`, `company`, `domain`, `brand`, `country`, `address`, `position`, `contact_name`, `phone`, `email`, `currency`, `rib`, `payment_terms`, `reliability`) VALUES
(6, 'Sourcing-IT Limited', 'Hardware IT', 'HP IBM Cisco Qnap Synologie', 'UK', 'Unit 9 Reading Road Hook Hampshire RG27 9DB', 'Purchasing', 'Charley Wemyss', '447394802901', 'charley@sourcing-it.co.uk', 'USD', 'GB29NWBK60161331926819', 'Net 30', 'High'),
(7, 'Sourcing-IT Limited', 'Hardware IT', 'HP IBM Cisco Qnap Synologie', 'UK', 'Unit 9 Reading Road Hook Hampshire RG27 9DB', 'Operations Manager', 'Jaqueline Edwards', '44 (0) 1189 736 675', 'Jaqueline@Sourcing-IT.co.uk', 'USD', 'GB29NWBK60161331926819', 'Net 30', 'High'),
(8, 'sb-informatique', 'Hardware IT', 'Aruba', 'Maroc', '61 AV Lala Yacout et Mustapha El Maani Etg 2 N°62 Casablanca', 'Sales Manager', 'Mehdi', '669 507 125', 'direction@sb-informatique.com', 'MAD', 'MA6400011000000012345678917', 'Net 45', 'Medium'),
(9, 'MBCom', 'Software IT', 'VMware', 'Egypt', 'Egypt, Libya, Morocco & West Africa', 'Technical Sales Engineer', 'Moataz Shawky', '20102223054', 'M.Shawky@mbcom.com', 'USD', 'EG800002000156789012345180002', 'Net 60', 'Medium'),
(10, 'Southcomp', 'Software IT', 'VMware', 'Maroc', 'Marina casablanca', 'sales', 'Aziza Menkari', '212 664 416 604', 'A.Mankari@southcomp-polaris.com', 'MAD', 'MA6400011000000098765432100', 'Net 30', 'High'),
(11, 'Cimelect', 'Hardware IT', 'CORNING', 'Maroc', 'Casablanca, Maroc', 'Responsable Achats', 'Responsable Cimelect', '0600000000', 'contact@cimelect.com', 'MAD', 'MA0000000000000000000000000', 'Net 30', 'High'),
(12, 'capgmny', 'Software IT', 'cisco', 'USA', 'florida', 'respo achat', 'el barni yassine', '0923456543', 'elbarniYassine@gmail.com', 'USD', '', '30 net', 'High');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `alembic_version`
--
ALTER TABLE `alembic_version`
  ADD PRIMARY KEY (`version_num`);

--
-- Index pour la table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `ix_clients_id` (`id`);

--
-- Index pour la table `devis_items`
--
ALTER TABLE `devis_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `devis_id` (`devis_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `ix_devis_items_id` (`id`);

--
-- Index pour la table `devis_oddnet`
--
ALTER TABLE `devis_oddnet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`);

--
-- Index pour la table `hardware_it`
--
ALTER TABLE `hardware_it`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Index pour la table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_leads_client` (`client_id`);

--
-- Index pour la table `oddnet`
--
ALTER TABLE `oddnet`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Index pour la table `opportunities`
--
ALTER TABLE `opportunities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_lead_id` (`lead_id`);

--
-- Index pour la table `opportunity_items`
--
ALTER TABLE `opportunity_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `opportunity_id` (`opportunity_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `ix_opportunity_items_id` (`id`);

--
-- Index pour la table `po_items`
--
ALTER TABLE `po_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `ix_po_items_id` (`id`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `ix_products_id` (`id`),
  ADD KEY `fk_customer` (`customer_id`);

--
-- Index pour la table `product_shipping_info`
--
ALTER TABLE `product_shipping_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `ix_product_shipping_info_id` (`id`);

--
-- Index pour la table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `opportunity_id` (`opportunity_id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `ix_projects_id` (`id`);

--
-- Index pour la table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `ix_purchase_orders_id` (`id`);

--
-- Index pour la table `shipping_info`
--
ALTER TABLE `shipping_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hardware_id` (`hardware_id`),
  ADD KEY `ix_shipping_info_id` (`id`);

--
-- Index pour la table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_suppliers_id` (`id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT pour la table `devis_items`
--
ALTER TABLE `devis_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `devis_oddnet`
--
ALTER TABLE `devis_oddnet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `hardware_it`
--
ALTER TABLE `hardware_it`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `oddnet`
--
ALTER TABLE `oddnet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `opportunities`
--
ALTER TABLE `opportunities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT pour la table `opportunity_items`
--
ALTER TABLE `opportunity_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `po_items`
--
ALTER TABLE `po_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `product_shipping_info`
--
ALTER TABLE `product_shipping_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT pour la table `shipping_info`
--
ALTER TABLE `shipping_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `devis_items`
--
ALTER TABLE `devis_items`
  ADD CONSTRAINT `devis_items_ibfk_1` FOREIGN KEY (`devis_id`) REFERENCES `devis_oddnet` (`id`),
  ADD CONSTRAINT `devis_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `devis_oddnet`
--
ALTER TABLE `devis_oddnet`
  ADD CONSTRAINT `devis_oddnet_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `hardware_it`
--
ALTER TABLE `hardware_it`
  ADD CONSTRAINT `hardware_it_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `hardware_it_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `opportunities`
--
ALTER TABLE `opportunities`
  ADD CONSTRAINT `fk_lead_id` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `opportunity_items`
--
ALTER TABLE `opportunity_items`
  ADD CONSTRAINT `opportunity_items_ibfk_1` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`),
  ADD CONSTRAINT `opportunity_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `po_items`
--
ALTER TABLE `po_items`
  ADD CONSTRAINT `po_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `po_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_customer` FOREIGN KEY (`customer_id`) REFERENCES `clients` (`id`),
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Contraintes pour la table `product_shipping_info`
--
ALTER TABLE `product_shipping_info`
  ADD CONSTRAINT `product_shipping_info_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`),
  ADD CONSTRAINT `projects_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`);

--
-- Contraintes pour la table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Contraintes pour la table `shipping_info`
--
ALTER TABLE `shipping_info`
  ADD CONSTRAINT `shipping_info_ibfk_1` FOREIGN KEY (`hardware_id`) REFERENCES `hardware_it` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
