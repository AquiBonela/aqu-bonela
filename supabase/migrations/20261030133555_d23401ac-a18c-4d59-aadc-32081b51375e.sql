INSERT INTO public.categories (name, slug, is_provisional, sort_order) VALUES ('Servicios públicos','servicios-publicos', false, 0)
ON CONFLICT DO NOTHING;

WITH c AS (SELECT id FROM public.categories WHERE slug='servicios-publicos'),
ins AS (
INSERT INTO public.listings (slug,type,category_id,name,activity,short_description,description,status,tags,labels,cover_url)
SELECT v.slug, 'publico'::listing_type, c.id, v.name, v.act, v.sd, v.d, 'publicada', v.tags, v.labels, v.cover FROM c, (VALUES
('ayuntamiento','Ayuntamiento de Casarabonela','Administración','Registro, padrón, licencias y atención al vecino en la Plaza de Buenavista.',
 E'Casa consistorial del municipio. Aquí puedes hacer la mayoría de gestiones con el Ayuntamiento: registro de documentos, empadronamiento y certificados, licencias de obra y actividad, pago de tasas e impuestos municipales y solicitudes generales.\n\nMuchos trámites también pueden hacerse en la sede electrónica municipal con certificado digital o Cl@ve.\n\nConsejo: para gestiones de urbanismo o con el alcalde, llama antes para pedir cita.',
 ARRAY['ayuntamiento','padron','empadronamiento','registro','licencias','tasas','certificado','alcalde','tramites','sede electronica'], ARRAY['Accesible','Cita previa recomendada'],
 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=1200&q=70&auto=format&fit=crop'),
('consultorio-medico','Consultorio Médico de Casarabonela','Salud','Medicina de familia, enfermería, análisis y recetas. Cita por ClicSalud+ o Salud Responde.',
 E'Consultorio del Servicio Andaluz de Salud (Distrito Valle del Guadalhorce). Atiende medicina de familia, enfermería, extracciones y análisis de sangre, electrocardiogramas, recetas y vacunas.\n\nCita previa: app Salud Andalucía, ClicSalud+ o Salud Responde (955 54 50 60).\nUrgencias: 951 03 14 37. En una emergencia vital llama al 112.\n\nHospital de referencia: Virgen de la Victoria (Málaga).',
 ARRAY['medico','consultorio','salud','enfermeria','ats','analisis','recetas','vacunas','urgencias','sas','centro de salud'], ARRAY['Cita previa','Accesible'],
 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=70&auto=format&fit=crop'),
('biblioteca-municipal','Biblioteca Municipal Francisco Castellano','Cultura y deporte','Préstamo de libros, sala de estudio, rincón infantil y ordenadores con internet.',
 E'Biblioteca pública municipal. Préstamo gratuito de libros, revistas y películas con el carné de la Red de Bibliotecas Públicas de Andalucía, sala de lectura y estudio, rincón infantil y ordenadores con acceso a internet y wifi.\n\nOrganiza club de lectura, cuentacuentos y actividades de animación lectora durante el curso.\n\nEl carné es gratuito: solo necesitas tu DNI.',
 ARRAY['biblioteca','libros','prestamo','estudio','lectura','wifi','internet','cuentacuentos','club de lectura'], ARRAY['Wifi gratis','Gratuito'],
 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=70&auto=format&fit=crop'),
('gimnasio-municipal','Gimnasio Municipal','Cultura y deporte','Sala de musculación y cardio, gimnasia de mantenimiento y pilates. Abonos para vecinos.',
 E'Gimnasio municipal situado en el Edificio de Usos Múltiples. Dispone de sala de musculación, máquinas de cardio y espacio para clases dirigidas.\n\nActividades municipales durante el curso: gimnasia de mantenimiento para mayores, pilates y entrenamiento funcional.\n\nAbono mensual o trimestral con precio reducido para empadronados. Inscripciones en el propio gimnasio o en el Ayuntamiento.',
 ARRAY['gimnasio','deporte','musculacion','cardio','pilates','mantenimiento','mayores','fitness'], ARRAY['Abono vecinos'],
 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=70&auto=format&fit=crop'),
('servicios-sociales','Servicios Sociales Comunitarios','Servicios sociales','Dependencia, ayuda a domicilio, apoyo a familias y Centro de Información a la Mujer.',
 E'Atención social municipal y de la Mancomunidad Sierra de las Nieves. La trabajadora social informa y tramita la Ley de Dependencia, el servicio de ayuda a domicilio, teleasistencia, ayudas de emergencia social y apoyo a familias y mayores.\n\nCentro de Información a la Mujer (CIM): asesoramiento social y jurídico gratuito.\n\nAtención con cita previa. Ante violencia de género llama al 016 (gratuito y no deja rastro).',
 ARRAY['servicios sociales','trabajadora social','dependencia','ayuda a domicilio','mayores','teleasistencia','mujer','cim','familias'], ARRAY['Cita previa','Gratuito'],
 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=70&auto=format&fit=crop')
) AS v(slug,name,act,sd,d,tags,labels,cover)
RETURNING id, slug)
INSERT INTO public.listing_contacts (listing_id, phone, address, email, show_phone, show_address, show_email)
SELECT ins.id, v.phone, v.addr, v.email, v.phone IS NOT NULL, true, v.email IS NOT NULL FROM ins JOIN (VALUES
 ('ayuntamiento','952 456 561','Plaza de Buenavista, 1','ayuntamiento@casarabonela.es'),
 ('consultorio-medico','951 50 45 64','Avda. Fernando Díaz Herrero, 5',NULL),
 ('biblioteca-municipal','952 456 561','Calle Cuatro Esquinas',NULL),
 ('gimnasio-municipal','952 456 561','Avda. Fernando Díaz (Edificio de Usos Múltiples)',NULL),
 ('servicios-sociales','952 069 860','Avda. Fernando Díaz (Edificio de Usos Múltiples)',NULL)
) AS v(slug,phone,addr,email) ON v.slug = ins.slug;

INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
SELECT l.id, d, h.o::time, h.c::time FROM public.listings l
JOIN (VALUES
 ('ayuntamiento','08:00','15:00',1,5),
 ('consultorio-medico','08:00','15:00',1,5),
 ('biblioteca-municipal','16:00','20:00',1,5),
 ('gimnasio-municipal','09:00','13:00',1,5),
 ('gimnasio-municipal','17:00','22:00',1,5),
 ('servicios-sociales','10:00','13:00',2,2)
) AS h(slug,o,c,d1,d2) ON h.slug = l.slug AND l.type = 'publico'
CROSS JOIN LATERAL generate_series(h.d1, h.d2) d;